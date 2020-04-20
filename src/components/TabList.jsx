import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import './TabList.scss'

const TabList = ({ files, activeId, unsaveIds, onTabClick, onCloseTab }) => (
	<ul className='nav nav-pills tablist-components'>
		{files.map(file => {
			const withUnsavedMark = unsaveIds.includes(file.id)
			const fClassName = classNames({
				'nav-link': true,
				active: file.id === activeId,
				withUnsaved: withUnsavedMark
			})
			return (
				<li className='nav-item' key={file.id}>
					<a
						onClick={e => {
							e.preventDefault()
							onTabClick(file.id)
						}}
						className={fClassName}
						href='#'
					>
						{file.title}
						<span
							onClick={e => {
								e.stopPropagation()
								onCloseTab(file.id)
							}}
							className='ml-2 close-icon'
						>
							<FontAwesomeIcon icon={faTimes} />
						</span>
						{withUnsavedMark && (
							<span className='rounded-circle unsaved-icon ml-2'></span>
						)}
					</a>
				</li>
			)
		})}
	</ul>
)

TabList.propTypes = {
	files: PropTypes.array,
	activeId: PropTypes.string,
	unsaveIds: PropTypes.array,
	onTabClick: PropTypes.func,
	onCloseTab: PropTypes.func
}
TabList.defaultProps = {
	unsaveIds: []
}

export default TabList
