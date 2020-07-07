import React, { useState, useEffect, useRef } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSearch, faTimes } from '@fortawesome/free-solid-svg-icons'
import PropTypes from 'prop-types'
import useKeyPress from '../hooks/useKeyPress'

const FileSearch = ({ title, onFileSearch }) => {
	const [inputActive, setInputActive] = useState(false)
	const [value, setValue] = useState('')
	const node = useRef(null)
	const enterPressed = useKeyPress(13)
	const escPressed = useKeyPress(27)

	const closeSearch = () => {
		setInputActive(false)
		setValue('')
		// 搜索空字符串
		onFileSearch('')
	}

	useEffect(() => {
		if (enterPressed && inputActive) {
			onFileSearch(value)
		}
		if (escPressed && inputActive) {
			closeSearch()
		}
	})
	useEffect(() => {
		if (inputActive) {
			node.current.focus()
		}
	}, [inputActive])

	return (
		<div className='alert alert-primary d-flex justify-content-between align-items-center mb-0'>
			{!inputActive && (
				<>
					<span>{title}</span>
					<button
						onClick={() => {
							setInputActive(true)
						}}
						type='button'
						className='icon-button'
					>
						<FontAwesomeIcon size='lg' icon={faSearch} title='搜索' />
					</button>
				</>
			)}
			{inputActive && (
				<>
					<input
						className='form-control'
						style={{ width: '90%' }}
						value={value}
						ref={node}
						onChange={e => {
							setValue(e.target.value)
						}}
					/>
					<button onClick={closeSearch} type='button' className='icon-button'>
						<FontAwesomeIcon size='lg' icon={faTimes} title='关闭' />
					</button>
				</>
			)}
		</div>
	)
}

FileSearch.propTypes = {
	title: PropTypes.string,
	onFileSearch: PropTypes.func.isRequired
}
FileSearch.defaultProps = {
	title: '我的云文档'
}

export default FileSearch
