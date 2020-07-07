import React, { useState, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { faMarkdown } from '@fortawesome/free-brands-svg-icons'
import PropTypes from 'prop-types'
import useContextMenu from '../hooks/useContextMenu'
import { getParentNode } from '../utils/helper'

const FileList = ({ files, onFileClick, onSaveEdit, onFileDel }) => {
	const [editStatus, setEditStatus] = useState(false)
	const [value, setValue] = useState('')
	const closeSearch = editItem => {
		setEditStatus(false)
		setValue('')
		if (editItem.isNew) {
			onFileDel(editItem.id)
		}
	}

	const clickedItem = useContextMenu(
		[
			{
				label: '打开',
				click: () => {
					const parentElement = getParentNode(clickedItem.current, 'file-item')
					if (parentElement) {
						onFileClick(parentElement.dataset.id)
					}
				}
			},
			{
				label: '删除',
				click: () => {
					const parentElement = getParentNode(clickedItem.current, 'file-item')
					if (parentElement) {
						onFileDel(parentElement.dataset.id)
					}
				}
			},
			{
				label: '重命名',
				click: () => {
					const parentElement = getParentNode(clickedItem.current, 'file-item')
					if (parentElement) {
						const { id, title } = parentElement.dataset
						setEditStatus(id)
						setValue(title)
					}
				}
			}
		],
		'.file-list'
	)

	useEffect(() => {
		const handleInputE = e => {
			const { keyCode } = e
			const editItem = files.find(file => file.id === editStatus)
			if (keyCode === 13 && editStatus && value.trim() !== '') {
				onSaveEdit(editItem.id, value, editItem.isNew)
				setEditStatus(false)
				setValue('')
			} else if (keyCode === 27 && editStatus) {
				closeSearch(editItem)
			}
		}
		document.addEventListener('keyup', handleInputE)
		return () => {
			document.removeEventListener('keyup', handleInputE)
		}
	})
	useEffect(() => {
		const newFile = files.find(file => file.isNew)
		if (newFile) {
			setEditStatus(newFile.id)
			setValue(newFile.value)
		}
	}, [files])

	return (
		<ul className='list-group list-group-flush file-list'>
			{files.map(file => (
				<li
					className='list-group-item bg-light mx-0 row d-flex align-items-center file-item'
					key={file.id}
					data-id={file.id}
					data-title={file.title}
				>
					{file.id !== editStatus && !file.isNew && (
						<>
							{/* <span className='col-2'> */}
							<span>
								<FontAwesomeIcon size='lg' icon={faMarkdown} />
							</span>
							<span
								onClick={() => {
									onFileClick(file.id)
								}}
								className='col-6 c-link'
							>
								{file.title}
							</span>
						</>
					)}
					{(file.id === editStatus || file.isNew) && (
						<>
							<input
								className='form-control col-10'
								style={{ width: '90%' }}
								value={value}
								placeholder='请输入文件名'
								onChange={e => setValue(e.target.value)}
							/>
							<button
								onClick={() => closeSearch(file)}
								type='button'
								className='icon-button col-2'
							>
								<FontAwesomeIcon size='lg' icon={faTimes} title='关闭' />
							</button>
						</>
					)}
				</li>
			))}
		</ul>
	)
}

FileList.propTypes = {
	files: PropTypes.array,
	onFileClick: PropTypes.func,
	onFileDel: PropTypes.func,
	onSaveEdit: PropTypes.func
}

export default FileList
