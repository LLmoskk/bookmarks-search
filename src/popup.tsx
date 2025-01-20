import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import google from "data-base64:~assets/google.png"
import bing from "data-base64:~assets/bing.png"
import { ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"
import localforage from "localforage"

import "@/styles/style.css"

type BookmarkItem = {
  id: string
  title: string
  url?: string
  children?: BookmarkItem[]
}

function IndexPopup() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [selectedUrls, setSelectedUrls] = useState<Set<string>>(new Set())
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searchEngine, setSearchEngine] = useState<"google" | "bing">("google")

  // 获取所有书签URL
  const getAllBookmarkUrls = (
    items: BookmarkItem[]
  ): { url: string; title: string }[] => {
    let urls: { url: string; title: string }[] = []
    items.forEach((item) => {
      if (item.url) {
        urls.push({ url: item.url, title: item.title })
      }
      if (item.children) {
        urls = urls.concat(getAllBookmarkUrls(item.children))
      }
    })
    return urls
  }

  // 添加保存选中状态到 localforage 的函数
  const saveSelectionState = async (urls: Set<string>, folders: Set<string>) => {
    await localforage.setItem('selectedUrls', Array.from(urls))
    await localforage.setItem('selectedFolders', Array.from(folders))
  }

  // 从 localforage 加载选中状态
  const loadSelectionState = async () => {
    try {
      const savedUrls = await localforage.getItem<string[]>('selectedUrls')
      const savedFolders = await localforage.getItem<string[]>('selectedFolders')

      if (savedUrls) {
        setSelectedUrls(new Set(savedUrls))
      }
      if (savedFolders) {
        setSelectedFolders(new Set(savedFolders))
      }
    } catch (error) {
      console.error('加载选中状态失败:', error)
    }
  }

  // 修改初始化 useEffect
  useEffect(() => {
    // 获取所有书签
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      setBookmarks(bookmarkTreeNodes[0].children || [])
    })

    // 加载保存的选中状态
    loadSelectionState()
  }, [])

  // 修改处理搜索的函数
  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && searchKeyword.trim()) {
      const siteQuery = Array.from(selectedUrls)
        .map((url) => {
          const domain = new URL(url).hostname
          return `site:${domain}`
        })
        .join(" OR ")

      const searchQuery = `${searchKeyword} ${siteQuery}`
      const searchUrl =
        searchEngine === "google"
          ? `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
          : `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`

      window.open(searchUrl, "_blank")
    }
  }

  // 修改 handleCheckboxChange
  const handleCheckboxChange = (url: string) => {
    const newSelectedUrls = new Set(selectedUrls)
    if (selectedUrls.has(url)) {
      newSelectedUrls.delete(url)
    } else {
      newSelectedUrls.add(url)
    }
    setSelectedUrls(newSelectedUrls)
    // 保存新的选中状态
    saveSelectionState(newSelectedUrls, selectedFolders)
  }

  // 修改 handleFolderCheckboxChange
  const handleFolderCheckboxChange = (
    folderId: string,
    children: BookmarkItem[]
  ) => {
    const newSelectedFolders = new Set(selectedFolders)
    const newSelectedUrls = new Set(selectedUrls)

    const updateFolderAndChildren = (
      items: BookmarkItem[],
      isSelected: boolean
    ) => {
      items.forEach((item) => {
        if (item.children) {
          // 如果是文件夹，更新文件夹状态并递归处理子项
          if (isSelected) {
            newSelectedFolders.add(item.id)
          } else {
            newSelectedFolders.delete(item.id)
          }
          updateFolderAndChildren(item.children, isSelected)
        } else if (item.url) {
          // 如果是书签，更新 URL 状态
          if (isSelected) {
            newSelectedUrls.add(item.url)
          } else {
            newSelectedUrls.delete(item.url)
          }
        }
      })
    }

    const isSelected = !selectedFolders.has(folderId)
    if (isSelected) {
      newSelectedFolders.add(folderId)
    } else {
      newSelectedFolders.delete(folderId)
    }

    updateFolderAndChildren(children, isSelected)

    setSelectedFolders(newSelectedFolders)
    setSelectedUrls(newSelectedUrls)
    // 保存新的选中状态
    saveSelectionState(newSelectedUrls, newSelectedFolders)
  }

  // 修改 handleClearSelection
  const handleClearSelection = () => {
    setSelectedUrls(new Set())
    setSelectedFolders(new Set())
    // 清除保存的选中状态
    saveSelectionState(new Set(), new Set())
  }

  // 添加检查文件夹是否应该被选中的函数
  const shouldFolderBeSelected = (items: BookmarkItem[]): boolean => {
    let hasUnselectedItem = false

    for (const item of items) {
      if (item.children) {
        // 如果是文件夹，递归检查其子项
        if (
          !selectedFolders.has(item.id) ||
          !shouldFolderBeSelected(item.children)
        ) {
          hasUnselectedItem = true
          break
        }
      } else if (item.url) {
        // 如果是书签，检查是否被选中
        if (!selectedUrls.has(item.url)) {
          hasUnselectedItem = true
          break
        }
      }
    }

    return !hasUnselectedItem
  }

  // 修改渲染书签的函数，添加自动检查父文件夹状态的逻辑
  const renderBookmarks = (items: BookmarkItem[]) => {
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            {item.children ? (
              <Collapsible className="mt-2">
                <div className="flex gap-1 items-center">
                  <CollapsibleTrigger className="p-1 rounded-sm hover:bg-gray-100">
                    <ChevronRight className="w-4 h-4" />
                  </CollapsibleTrigger>
                  <Checkbox
                    className="mr-2"
                    checked={
                      selectedFolders.has(item.id) ||
                      shouldFolderBeSelected(item.children)
                    }
                    onCheckedChange={() =>
                      handleFolderCheckboxChange(item.id, item.children || [])
                    }
                  />
                  <span className="font-medium text-gray-700">
                    {!item.title || item.title.trim() === ""
                      ? "未命名"
                      : item.title}
                  </span>
                </div>
                <CollapsibleContent className="pl-4 mt-2">
                  {renderBookmarks(item.children)}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="flex gap-1 items-center pl-3">
                <Checkbox
                  checked={selectedUrls.has(item.url || "")}
                  onCheckedChange={() => handleCheckboxChange(item.url || "")}
                  className="mr-2"
                />
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block overflow-hidden text-blue-600 truncate whitespace-nowrap text-ellipsis hover:text-blue-800 hover:underline">
                  {!item.title || item.title.trim() === ""
                    ? item.url
                    : item.title}
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 w-[400px] max-h-[600px] overflow-auto">
      <div className="mb-4 space-y-2">
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="输入关键词后按回车搜索..."
            className="flex-1 p-2 rounded-md border"
          />
          <button
            onClick={() => setSearchEngine("google")}
            className={`p-2 rounded-md border ${
              searchEngine === "google" ? "bg-blue-100 border-blue-300" : ""
            }`}>
            <img src={google} alt="Google" className="w-5 h-5" />
          </button>
          <button
            onClick={() => setSearchEngine("bing")}
            className={`p-2 rounded-md border ${
              searchEngine === "bing" ? "bg-blue-100 border-blue-300" : ""
            }`}>
            <img src={bing} alt="Bing" className="w-5 h-5" />
          </button>
          {(selectedUrls.size > 0 || selectedFolders.size > 0) && (
            <button
              onClick={handleClearSelection}
              className="px-3 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600">
              清空选择
            </button>
          )}
        </div>
      </div>
      <div>{renderBookmarks(bookmarks)}</div>
    </div>
  )
}

export default IndexPopup
