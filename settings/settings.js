const { remote,ipcRenderer } = require('electron')
const Store = require('electron-store')
const settingsStore = new Store({ name: 'Settings' })
const configArr = [
	'#savedFileLocation',
	'#accessKey',
	'#secretKey',
	'#bucketName'
]

const $ = selector => {
	const result = document.querySelectorAll(selector)
	return result.length > 1 ? result : result[0]
}

document.addEventListener('DOMContentLoaded', () => {
	let savedLocation = settingsStore.get('savedFileLocation')
	if (savedLocation) {
		$('#savedFileLocation').value = savedLocation
	}
	// 获取之前保存的配置信息
	configArr.forEach(selector => {
		const savedValue = settingsStore.get(selector.substr(1))
		if (savedValue) {
			$(selector).value = savedValue
		}
	})
	$('#select-new-location').addEventListener('click', () => {
		remote.dialog
			.showOpenDialog({
				properties: ['openDirectory', 'createDirectory', 'promptToCreate'],
				message: '选择文件的存储路径'
			})
			.then(res => {
				if (res.filePaths[0]) {
					$('#savedFileLocation').value = res.filePaths[0]
				}
			})
			.catch(err => console.log(err))
	})
	$('#settings-form').addEventListener('submit', e => {
		e.preventDefault()
		configArr.forEach(selector => {
			if ($(selector)) {
				let { id, value } = $(selector)
				settingsStore.set(id, value ? value : '')
			}
		})
		// 提交新配置后发送事件
		ipcRenderer.send('config-is-saved')
		remote.getCurrentWindow().close()
	})
	$('.nav-tabs').addEventListener('click', e => {
		e.preventDefault()
		$('.nav-link').forEach(elem => {
			elem.classList.remove('active')
		})
		e.target.classList.add('active')
		$('.config-area').forEach(elem => {
			elem.style.display = 'none'
		})
		if ($(e.target.dataset.tab)) {
			$(e.target.dataset.tab).style.display = 'block'
		}
	})
})
