import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import bing from "data-base64:~assets/bing.png"
import google from "data-base64:~assets/google.png"
import localforage from "localforage"
import { ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"

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
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searchEngine, setSearchEngine] = useState<"google" | "bing">("google")
  const [isComposing, setIsComposing] = useState(false)

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

  // 添加保存展开状态的函数
  const saveExpandedState = async (folders: Set<string>) => {
    await localforage.setItem("expandedFolders", Array.from(folders))
  }

  // 修改 saveSelectionState 函数，同时保存展开状态
  const saveSelectionState = async (
    urls: Set<string>,
    folders: Set<string>,
    expanded: Set<string>
  ) => {
    await localforage.setItem("selectedUrls", Array.from(urls))
    await localforage.setItem("selectedFolders", Array.from(folders))
    await localforage.setItem("expandedFolders", Array.from(expanded))
  }

  // 修改 loadSelectionState 函数，加载展开状态
  const loadSelectionState = async () => {
    try {
      const savedUrls = await localforage.getItem<string[]>("selectedUrls")
      const savedFolders = await localforage.getItem<string[]>("selectedFolders")
      const savedExpanded = await localforage.getItem<string[]>("expandedFolders")

      if (savedUrls) {
        setSelectedUrls(new Set(savedUrls))
      }
      if (savedFolders) {
        setSelectedFolders(new Set(savedFolders))
      }
      if (savedExpanded) {
        setExpandedFolders(new Set(savedExpanded))
      }
    } catch (error) {
      console.error("加载状态失败:", error)
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

  const constructSearchUrl = (
    keyword: string,
    selectedUrls: Set<string>,
    engine: "google" | "bing"
  ): string => {
    const siteQuery = Array.from(selectedUrls)
      .map((url) => {
        const domain = new URL(url).hostname
        return `site:${domain}`
      })
      .join(" OR ")
    const searchQuery = `${keyword} ${siteQuery}`
    return engine === "google"
      ? `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`
      : `https://www.bing.com/search?q=${encodeURIComponent(searchQuery)}`
  }

  const executeSearch = (engine: "google" | "bing") => {
    if (searchKeyword.trim()) {
      const searchUrl = constructSearchUrl(searchKeyword, selectedUrls, engine)
      window.open(searchUrl, "_blank")
    }
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isComposing && searchKeyword.trim()) {
      const searchUrl = constructSearchUrl(
        searchKeyword,
        selectedUrls,
        searchEngine
      )
      window.open(searchUrl, "_blank")
    }
  }

  // 修改搜索引擎按钮的点击处理函数
  const handleSearchEngineClick = (engine: "google" | "bing") => {
    if (searchEngine === engine) {
      executeSearch(engine)
    } else {
      setSearchEngine(engine)
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
    saveSelectionState(newSelectedUrls, selectedFolders, expandedFolders)
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
    saveSelectionState(newSelectedUrls, newSelectedFolders, expandedFolders)
  }

  // 添加处理折叠/展开的函数
  const handleCollapsibleChange = (folderId: string, isOpen: boolean) => {
    const newExpandedFolders = new Set(expandedFolders)
    if (isOpen) {
      newExpandedFolders.add(folderId)
    } else {
      newExpandedFolders.delete(folderId)
    }
    setExpandedFolders(newExpandedFolders)
    saveExpandedState(newExpandedFolders)
  }

  // 修改 handleClearSelection，同时保留展开状态
  const handleClearSelection = () => {
    setSelectedUrls(new Set())
    setSelectedFolders(new Set())
    saveSelectionState(new Set(), new Set(), expandedFolders)
  }

  // 添加检查文件夹是否应该被选中的函数
  const shouldFolderBeSelected = (items: BookmarkItem[]): boolean => {
    let hasUnselectedItem = false

    if (items.length === 0) {
      return false
    }

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

  const getFolderState = (items: BookmarkItem[]): boolean | "indeterminate" => {
    let checkedCount = 0
    let totalCount = 0

    const countItems = (items: BookmarkItem[]) => {
      items.forEach((item) => {
        if (item.children) {
          countItems(item.children)
        } else if (item.url) {
          totalCount++
          if (selectedUrls.has(item.url)) {
            checkedCount++
          }
        }
      })
    }

    countItems(items)

    if (totalCount === 0) return false
    if (checkedCount === 0) return false
    if (checkedCount === totalCount) return true // 改为返回 boolean
    return "indeterminate"
  }

  // 修改渲染书签的函数，添加展开状态控制
  const renderBookmarks = (items: BookmarkItem[]) => {
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            {item.children ? (
              <Collapsible
                className="mt-2"
                open={expandedFolders.has(item.id)}
                onOpenChange={(isOpen) => handleCollapsibleChange(item.id, isOpen)}
              >
                <div className="flex gap-1 items-center">
                  <CollapsibleTrigger className="p-1 rounded-sm hover:bg-gray-100">
                    <ChevronRight className="w-4 h-4" />
                  </CollapsibleTrigger>
                  <Checkbox
                    className="mr-2"
                    checked={getFolderState(item.children)}
                    disabled={item.children?.length === 0}
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
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="输入关键词后按回车搜索..."
            className="flex-1 p-2 rounded-md border"
          />
          <button
            onClick={() => handleSearchEngineClick("google")}
            className={`p-2 rounded-md border ${
              searchEngine === "google" ? "bg-blue-100 border-blue-300" : ""
            }`}>
            <img src={google} alt="Google" className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleSearchEngineClick("bing")}
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
