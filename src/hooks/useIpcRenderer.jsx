import { useEffect } from 'react'
const { ipcRenderer } = window.require('electron')

const useIpcRenderer = keyCBMap => {
	useEffect(() => {
		Object.keys(keyCBMap).forEach(key => ipcRenderer.on(key, keyCBMap[key]))
		return () =>
			Object.keys(keyCBMap).forEach(key =>
				ipcRenderer.removeListener(key, keyCBMap[key])
			)
	})
}

export default useIpcRenderer
