export const flattenArr = arr =>
	arr.reduce((map, item) => {
		map[item.id] = item
		return map
	}, {})

export const objToArr = obj => Object.keys(obj).map(key => obj[key])

// 获取父节点
export const getParentNode = (node, parentClassName) => {
	let current = node
	while (current !== null) {
		if (current.classList.contains(parentClassName)) {
			return current
		}
		current = current.parentNode
	}
	return false
}

export const timestampToStr = timestamp => {
	const date = new Date(timestamp)
	return date.toLocaleString()
}
