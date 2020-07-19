import './App.css'
import FileSearch from './components/FileSearch'
import FileList from './components/FileList'
import React, { useState } from 'react'
import BottomBtn from './components/BottomBtn'
import TabList from './components/TabList'
import Loader from './components/Loader'
import { faPlus, faFileImport } from '@fortawesome/free-solid-svg-icons'
import SimpleMDE from 'react-simplemde-editor'
import uuid from 'uuid/v4'
import { flattenArr, objToArr, timestampToStr } from './utils/helper'

import 'bootstrap/dist/css/bootstrap.min.css'
import 'easymde/dist/easymde.min.css'
import fileHelper from './utils/fileHelper'
import useIpcRenderer from './hooks/useIpcRenderer'

// 若不使用 window.require，webpack 打包时会从 node_modules 中查找
const { join, basename, dirname } = window.require('path')
const { remote, ipcRenderer } = window.require('electron')
const Store = window.require('electron-store')

const fileStore = new Store({ name: '文件数据' })
const settingsStore = new Store({ name: 'Settings' })

const saveFilesToStore = files => {
	// 不需要把所有信息都进行缓存（比如：isNew body）
	const filesStoreObj = objToArr(files).reduce((result, file) => {
		const { id, path, title, createdAt, isSynced, updatedAt } = file
		result[id] = {
			id,
			path,
			title,
			createdAt,
			isSynced,
			updatedAt
		}
		return result
	}, {})
	fileStore.set('files', filesStoreObj)
}

function App() {
	// 所有文件
	const [files, setFiles] = useState(fileStore.get('files') || {})
	// 当前编辑的文件
	const [activeFileID, setActiveFileID] = useState('')
	// 所有打开的文件
	const [openedFileIDs, setOpenedFileIDs] = useState([])
	// 所有未保存的文件
	const [unsavedFileIDs, setUnsavedFileIDs] = useState([])
	// 搜索到的文件
	const [searchedFiles, setSearchedFiles] = useState([])
	const [loading, setLoading] = useState(false)
	const filesArr = objToArr(files)
	const savedLocation =
		settingsStore.get('savedFileLocation') ||
		remote.app.getPath('documents') + '/MD文件夹'

	const getAutoSync = () =>
		['accessKey', 'secretKey', 'bucketName', 'autoSync'].every(
			key => !!settingsStore.get(key)
		)

	const updateFileName = (id, title, isNew) => {
		const newPath = isNew
			? join(savedLocation, `${title}.md`)
			: join(dirname(files[id].path), `${title}.md`)
		const modifiedFile = { ...files[id], title, isNew: false, path: newPath }
		const newFiles = { ...files, [id]: modifiedFile }

		if (isNew) {
			fileHelper.writeFile(newPath, files[id].body).then(() => {
				setFiles(newFiles)
				saveFilesToStore(newFiles)
			})
		} else {
			const oldPath = files[id].path
			fileHelper.renameFile(oldPath, newPath).then(() => {
				setFiles(newFiles)
				saveFilesToStore(newFiles)
			})
		}
	}

	const fileClick = fileID => {
		// 设置当前活跃的文件
		setActiveFileID(fileID)
		const currentFile = files[fileID]
		const { id, title, path, isLoaded } = currentFile
		if (!isLoaded) {
			if (getAutoSync()) {
				ipcRenderer.send('download-file', { key: `${title}.md`, path, id })
			} else {
				fileHelper.readFile(currentFile.path).then(value => {
					const newFile = { ...files[fileID], body: value, isLoaded: true }
					setFiles({ ...files, [fileID]: newFile })
				})
			}
		}
		// 添加新的 fileID 到 openedFiles
		if (!openedFileIDs.includes(fileID)) {
			setOpenedFileIDs([...openedFileIDs, fileID])
		}
	}

	const tabClick = fileID => {
		setActiveFileID(fileID)
	}
	const tabClose = id => {
		// 删除当前的 id
		const tabsWithout = openedFileIDs.filter(fileID => fileID !== id)
		setActiveFileID(tabsWithout)
		tabsWithout.length ? setActiveFileID(tabsWithout[0]) : setActiveFileID('')
	}

	const fileChange = (id, value) => {
		// simpleMDE 会检测键盘事件，需要进行判断
		if (value !== files[id].body) {
			const newFile = { ...files[id], body: value }
			setFiles({ ...files, [id]: newFile })
			// 更新 unsavedIDs
			if (!unsavedFileIDs.includes(id)) {
				setUnsavedFileIDs([...unsavedFileIDs, id])
			}
		}
	}

	const delFile = id => {
		if (files[id].isNew) {
			const { [id]: value, ...afterDel } = files
			setFiles(afterDel)
			saveFilesToStore(afterDel)
		} else {
			fileHelper.delFile(files[id].path).then(() => {
				const { [id]: value, ...afterDel } = files
				setFiles(afterDel)
				saveFilesToStore(afterDel)
			})
		}
		// 如果文件是打开的
		tabClose(id)
	}

	const fileSearch = keyword => {
		const newFiles = filesArr.filter(file => file.title.includes(keyword))
		setSearchedFiles(newFiles)
	}

	const createNewFile = () => {
		const newID = uuid()
		const newFile = {
			id: newID,
			title: '',
			body: '新的MD文件',
			createdAt: new Date().getTime(),
			isNew: true
		}
		setFiles({ ...files, [newID]: newFile })
	}

	const saveCurrentFile = () => {
		const { path, body, title, id } = activeFile
		fileHelper.writeFile(path, body).then(() => {
			setUnsavedFileIDs(unsavedFileIDs.filter(value => value !== id))
			if (getAutoSync()) {
				ipcRenderer.send('upload-file', { key: `${title}.md`, path })
			}
		})
	}

	const impFiles = () => {
		remote.dialog
			.showOpenDialog({
				title: '请选择要导入的MD文件',
				properties: ['openFile', 'multiSelections'],
				filters: [{ name: 'Markdown files', extensions: ['md'] }]
			})
			.then(result => {
				const filteredPaths = result.filePaths.filter(path => {
					const alreadyAdded = Object.values(files).find(file => {
						return file.path === path
					})
					return !alreadyAdded
				})

				const impFilesArr = filteredPaths.map(path => {
					return {
						id: uuid(),
						title: basename(path, '.md'),
						path
					}
				})

				const newFiles = { ...files, ...flattenArr(impFilesArr) }

				setFiles(newFiles)
				saveFilesToStore(newFiles)
				if (impFilesArr.length) {
					remote.dialog.showMessageBox({
						type: 'info',
						title: `成功导入`,
						message: `成功导入了${impFilesArr.length}个MD文件`
					})
				}
			})
			.catch(err => console.log(err))
	}

	const activeFileUploaded = () => {
		const { id } = activeFile
		const modifiedFile = {
			...files[id],
			isSynced: true,
			updatedAt: new Date().getTime()
		}
		const newFiles = { ...files, [id]: modifiedFile }
		setFiles(newFiles)
		saveFilesToStore(newFiles)
	}

	const activeFileDownloaded = (e, message) => {
		const currentFile = files[message.id]
		const { id, path } = currentFile
		fileHelper.readFile(path).then(value => {
			let newFile = {
				...files[id],
				body: value,
				isLoaded: true
			}
			if (message.status === 'download-success') {
				newFile = {
					...newFile,
					isSynced: true,
					updatedAt: new Date().getTime()
				}
			}
			const newFiles = { ...files, [id]: newFile }
			setFiles(newFiles)
			saveFilesToStore(newFiles)
		})
	}

	const filesUploaded = () => {
		const newFiles = objToArr(files).reduce((result, file) => {
			const currentTime = new Date().getTime()
			result[file.id] = {
				...files[file.id],
				isSynced: true,
				updatedAt: currentTime
			}
			return result
		}, {})
		setFiles(newFiles)
		saveFilesToStore(newFiles)
	}

	const openedFiles = openedFileIDs.map(openID => {
		return files[openID]
	})
	const activeFile = files[activeFileID]
	// 如果搜索列表中有就用搜索列表文件，否则用 files
	// TODO：待简化
	const fileListArr = searchedFiles.length ? searchedFiles : filesArr

	useIpcRenderer({
		'create-new-file': createNewFile,
		'import-file': impFiles,
		'search-file': fileSearch,
		'save-edit-file': saveCurrentFile,
		'active-file-uploaded': activeFileUploaded,
		'file-downloaded': activeFileDownloaded,
		'loading-status': (message, status) => setLoading(status),
		'files-uploaded': filesUploaded
	})

	return (
		<div className='App container-fluid px-0'>
			{loading && <Loader />}
			<div className='row no-gutters'>
				<div className='col-3 left-panel'>
					<FileSearch title='我的云文档' onFileSearch={fileSearch} />
					<FileList
						files={fileListArr}
						onFileClick={fileClick}
						onFileDel={delFile}
						onSaveEdit={updateFileName}
					/>
					<div className='row no-gutters button-group'>
						<div className='col'>
							<BottomBtn
								text='新建'
								colorClass='btn-primary'
								icon={faPlus}
								onBtnClick={createNewFile}
							/>
						</div>
						<div className='col'>
							<BottomBtn
								text='导入'
								onBtnClick={impFiles}
								colorClass='btn-success'
								icon={faFileImport}
							/>
						</div>
					</div>
				</div>
				<div className='col-9 right-panel'>
					{!activeFile && (
						<div className='start-page'>选择或者创建新的 MarkDown 文档</div>
					)}
					{activeFile && (
						<>
							<TabList
								files={openedFiles}
								activeId={activeFileID}
								unsaveIds={unsavedFileIDs}
								onTabClick={tabClick}
								onCloseTab={tabClose}
							/>
							{/* 根据 key 来区分不同的内容 */}
							<SimpleMDE
								key={activeFile && activeFile.id}
								onChange={value => {
									fileChange(activeFileID, value)
								}}
								value={activeFile && activeFile.body}
								options={{
									minHeight: '515px'
								}}
							/>
							{activeFile.isSynced && (
								<span className='sync-status'>
									已同步，上次同步于 {timestampToStr(activeFile.updatedAt)}
								</span>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	)
}

export default App
