const { app, Menu, ipcMain, dialog } = require('electron')
const isDev = require('electron-is-dev')
const menuTemplate = require('./src/menuTemplate')
const AppWin = require('./src/AppWin')
const path = require('path')
const QiNiuManager = require('./src/utils/QiniuManager')
const Store = require('electron-store')
const { autoUpdater } = require('electron-updater')

const settingsStore = new Store({ name: 'Settings' })
const fileStore = new Store({ name: '文件数据' })
let mainWindow, settingsWindow

const createManager = () => {
	const accessKey = settingsStore.get('accessKey')
	const secretKey = settingsStore.get('secretKey')
	const bucketName = settingsStore.get('bucketName')
	return new QiNiuManager(accessKey, secretKey, bucketName)
}

app.on('ready', () => {
	if (isDev) {
		autoUpdater.updateConfigPath = path.join(__dirname, 'dev-app-update.yml')
	}

	autoUpdater.autoDownload = false
	autoUpdater.checkForUpdates()
	autoUpdater.on('error', error => {
		dialog.showErrorBox('Error:', error == null ? 'unknown' : error)
	})
	autoUpdater.on('checking-for-update', () => {
		console.log('正在检查更新')
	})
	autoUpdater.on('update-available', () => {
		dialog.showMessageBox(
			{
				type: 'info',
				title: '应用有新的版本',
				message: '发现新版本，是否现在更新？',
				buttons: ['是', '否']
			},
			buttonIdx => {
				if (buttonIdx === 0) {
					autoUpdater.downloadUpdate()
				}
			}
		)
	})
	autoUpdater.on('update-not-available', () => {
		dialog.showMessageBox({
			title: '没有新版本',
			message: '当前已是最新版本'
		})
	})
	autoUpdater.on('download-progress', progressObj => {
		let log_message = '下载进度：' + progressObj.bytesPerSecond
		log_message = log_message + ' - 下载' + progressObj.percent + '%'
		log_message =
			log_message +
			'（' +
			progressObj.transferred +
			'/' +
			progressObj.total +
			progressObj
		console.log(log_message)
	})
	autoUpdater.on('update-downloaded', () => {
		dialog.showMessageBox(
			{
				title: '安装更新',
				message: '已下载完毕，应用将重启以进行更新'
			},
			() => setImmediate(() => autoUpdater.quitAndInstall())
		)
	})

	const mainWinConfig = {
		width: 1440,
		height: 768
	}
	const urlLocation = isDev
		? 'http://localhost:3000'
		: `file://${path.join(__dirname, './index.html')}`
	mainWindow = new AppWin(mainWinConfig, urlLocation)
	mainWindow.on('closed', () => {
		mainWindow = null
	})
	// 设置菜单
	let menu = Menu.buildFromTemplate(menuTemplate)
	Menu.setApplicationMenu(menu)

	ipcMain.on('open-settings-window', () => {
		const settingsWinConfig = {
			width: 500,
			height: 400,
			parent: mainWindow
		}
		// 设置面板的 url
		const settingsFileLocation = `file://${path.join(
			__dirname,
			'./settings/settings.html'
		)}`
		settingsWindow = new AppWin(settingsWinConfig, settingsFileLocation)
		settingsWindow.removeMenu()
		settingsWindow.on('closed', () => {
			settingsWindow = null
		})
	})

	ipcMain.on('upload-file', (e, data) => {
		const manager = createManager()
		manager
			.uploadFile(data.key, data.path)
			.then(data => {
				mainWindow.webContents.send('active-file-uploaded')
			})
			.catch(err => {
				dialog.showErrorBox('同步失败', '请检查七牛云参数是否正确')
			})
	})

	ipcMain.on('download-file', (e, data) => {
		const { key, path, id } = data
		const manager = createManager()
		const filesObj = fileStore.get('files')
		manager.getStat(key).then(
			resp => {
				const serverUpdatedTime = Math.round(resp.putTime / 10000)
				const localUpdatedTime = filesObj[id].updatedAt
				if (serverUpdatedTime > localUpdatedTime || !localUpdatedTime) {
					manager.downloadFile(key, path).then(() => {
						mainWindow.webContents.send('file-downloaded', {
							status: 'download-success',
							id
						})
					})
				} else {
					mainWindow.webContents.send('file-downloaded', {
						status: 'no-new-file',
						id
					})
				}
			},
			err => {
				if (error.statusCode === 612) {
					mainWindow.webContents.send('file-downloaded', {
						status: 'no-file',
						id
					})
				}
			}
		)
	})

	ipcMain.on('upload-all-to-qiniu', () => {
		const manager = createManager()
		mainWindow.webContents.send('loading-status', true)
		const filesObj = fileStore.get('files') || {}
		const uploadPromiseArr = Object.keys(filesObj).map(key => {
			const file = filesObj[key]
			return manager.uploadFile(`${file.title}.md`, file.path)
		})
		Promise.all(uploadPromiseArr)
			.then(result => {
				dialog.showMessageBox({
					type: 'info',
					title: `成功上传了${result.length}个文件`,
					message: `成功上传了${result.length}个文件`
				})
				mainWindow.webContents.send('files-uploaded')
			})
			.catch(() => {
				dialog.showErrorBox('同步失败', '请检查七牛云参数是否正确')
			})
			.finally(() => mainWindow.webContents.send('loading-status', false))
	})

	// 监视菜单项的索引
	ipcMain.on('config-is-saved', () => {
		let qiniuMenu =
			process.platform === 'darwin' ? menu.items[3] : menu.items[2]
		const switchItems = buer => {
			;[1, 2, 3].forEach(num => {
				qiniuMenu.submenu.items[num].enabled = buer
			})
		}
		const isConfig = ['accessKey', 'secretKey', 'bucketName'].every(
			key => !!settingsStore.get(key)
		)
		isConfig ? switchItems(true) : switchItems(false)
	})
})
