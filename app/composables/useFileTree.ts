import type { FileEntry } from '~/../../shared/types'

export interface TreeItem {
  id: string
  label: string
  icon?: string
  path: string
  type: 'file' | 'directory'
  children?: TreeItem[]
  defaultExpanded?: boolean
}

export function useFileTree() {
  const items = ref<TreeItem[]>([])
  const selectedFile = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const searchQuery = ref('')

  function fileEntryToTreeItem(entry: FileEntry, expandRoot = false): TreeItem {
    const icon = entry.type === 'directory'
      ? undefined
      : getFileIcon(entry.name)

    return {
      id: entry.path,
      label: entry.name,
      icon,
      path: entry.path,
      type: entry.type,
      defaultExpanded: expandRoot,
      children: entry.children?.map(child => fileEntryToTreeItem(child))
    }
  }

  function getFileIcon(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'md':
        return 'i-lucide-file-text'
      case 'ts':
      case 'tsx':
        return 'i-lucide-file-code'
      case 'js':
      case 'jsx':
        return 'i-lucide-file-code'
      case 'vue':
        return 'i-lucide-file-code'
      case 'json':
        return 'i-lucide-file-json'
      case 'css':
      case 'scss':
        return 'i-lucide-file-code'
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'svg':
        return 'i-lucide-file-image'
      default:
        return 'i-lucide-file'
    }
  }

  async function loadTree(path = '/') {
    loading.value = true
    error.value = null

    try {
      const response = await $fetch<{ data: FileEntry[] }>('/api/fs/list', {
        query: { path, recursive: 'true' }
      })

      items.value = response.data.map(entry => fileEntryToTreeItem(entry, true))
    } catch (e) {
      error.value = 'Failed to load file tree'
      console.error('Failed to load file tree:', e)
    } finally {
      loading.value = false
    }
  }

  async function readFile(path: string) {
    try {
      const response = await $fetch<{ data: { content: string, path: string, modifiedAt: string } }>('/api/fs/read', {
        method: 'POST',
        body: { path }
      })
      return response.data
    } catch (e) {
      console.error('Failed to read file:', e)
      throw e
    }
  }

  async function writeFile(path: string, content: string) {
    try {
      const response = await $fetch<{ data: { path: string, created: boolean } }>('/api/fs/write', {
        method: 'POST',
        body: { path, content }
      })
      return response.data
    } catch (e) {
      console.error('Failed to write file:', e)
      throw e
    }
  }

  async function createFile(parentPath: string, filename: string) {
    const path = parentPath === '/' ? `/${filename}` : `${parentPath}/${filename}`
    await writeFile(path, '')
    await loadTree()
    return path
  }

  async function createFolder(parentPath: string, foldername: string) {
    const path = parentPath === '/' ? `/${foldername}` : `${parentPath}/${foldername}`
    try {
      await $fetch('/api/fs/mkdir', {
        method: 'POST',
        body: { path }
      })
      await loadTree()
      return path
    } catch (e) {
      console.error('Failed to create folder:', e)
      throw e
    }
  }

  async function renameItem(oldPath: string, newName: string) {
    const parts = oldPath.split('/')
    parts.pop()
    const newPath = [...parts, newName].join('/')

    try {
      await $fetch('/api/fs/rename', {
        method: 'POST',
        body: { oldPath, newPath }
      })
      await loadTree()
      return newPath
    } catch (e) {
      console.error('Failed to rename:', e)
      throw e
    }
  }

  async function deleteItem(path: string) {
    try {
      await $fetch('/api/fs/delete', {
        method: 'POST',
        body: { path }
      })
      if (selectedFile.value === path) {
        selectedFile.value = null
      }
      await loadTree()
    } catch (e) {
      console.error('Failed to delete:', e)
      throw e
    }
  }

  async function moveItem(sourcePath: string, destinationPath: string) {
    try {
      const response = await $fetch<{ data: { oldPath: string, newPath: string, moved: boolean } }>('/api/fs/move', {
        method: 'POST',
        body: { sourcePath, destinationPath }
      })
      await loadTree()
      return response.data.newPath
    } catch (e) {
      console.error('Failed to move:', e)
      throw e
    }
  }

  const filteredItems = computed(() => {
    if (!searchQuery.value) return items.value

    const query = searchQuery.value.toLowerCase()

    function filterTree(items: TreeItem[]): TreeItem[] {
      return items.reduce<TreeItem[]>((acc, item) => {
        const matches = item.label.toLowerCase().includes(query)
        const filteredChildren = item.children ? filterTree(item.children) : []

        if (matches || filteredChildren.length > 0) {
          acc.push({
            ...item,
            children: filteredChildren.length > 0 ? filteredChildren : item.children,
            defaultExpanded: filteredChildren.length > 0 || matches
          })
        }

        return acc
      }, [])
    }

    return filterTree(items.value)
  })

  return {
    items,
    filteredItems,
    selectedFile,
    loading,
    error,
    searchQuery,
    loadTree,
    readFile,
    writeFile,
    createFile,
    createFolder,
    renameItem,
    deleteItem,
    moveItem
  }
}
