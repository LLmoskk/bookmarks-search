import { Checkbox } from "@/components/ui/checkbox"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { Switch } from "@/components/ui/switch"
import { useDebounce } from "ahooks"
import bing from "data-base64:~assets/bing.png"
import google from "data-base64:~assets/google.png"
import { ChevronRight } from "lucide-react"
import { useEffect, useState } from "react"

import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import "@/styles/style.css"

import { cn } from "./lib/utils"
import { constructSearchUrl } from "./utils"

type BookmarkItem = {
  id: string
  title: string
  url?: string
  children?: BookmarkItem[]
}

function IndexPopup() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [searchKeyword, setSearchKeyword] = useState("")
  const [isComposing, setIsComposing] = useState(false)
  const [filterKeywordInput, setFilterKeywordInput] = useState("")
  const filterKeyword = useDebounce(filterKeywordInput, { wait: 300 })

  const storage = new Storage({
    area: "local"
  })

  // 直接使用 useStorage 替代原来的 useState + useStorage 组合 需要复原状态的都用 useStorage 来写
  const [selectedUrls, setSelectedUrls] = useStorage<string[]>(
    {
      key: "selectedUrls",
      instance: storage
    },
    []
  )

  const [selectedFolders, setSelectedFolders] = useStorage<string[]>(
    {
      key: "selectedFolders",
      instance: storage
    },
    []
  )

  const [expandedFolders, setExpandedFolders] = useStorage<string[]>(
    {
      key: "expandedFolders",
      instance: storage
    },
    []
  )

  // 添加一个状态来保存filter 之前的展开折叠状态
  const [userExpandedFolders, setUserExpandedFolders] = useState<Set<string>>(
    new Set()
  )

  const [allBookmarks, setAllBookmarks] = useStorage(
    {
      key: "allBookmarks",
      instance: storage
    },
    []
  )
  const [sidebarEnabled, setSidebarEnabled] = useStorage(
    {
      key: "sidebarEnabled",
      instance: storage
    },
    true
  )
  const [searchEngine, setSearchEngine] = useStorage(
    {
      key: "searchEngine",
      instance: storage
    },
    "google" as "google" | "bing"
  )

  // 获取所有书签URL
  const getAllBookmarkUrls = (
    items: BookmarkItem[]
  ): { url: string; title: string }[] => {
    const urls: { url: string; title: string }[] = []

    const processBookmark = (item: BookmarkItem) => {
      if (item.url && item.url.startsWith("http")) {
        // 只保存必要的数据，并限制标题长度
        urls.push({
          url: item.url,
          title: (item.title || item.url).slice(0, 100) // 限制标题长度为100字符
        })
      }
      if (item.children) {
        item.children.forEach(processBookmark)
      }
    }

    items.forEach(processBookmark)

    // 如果数据量仍然太大，可以限制保存的书签数量
    return urls.slice(0, 1000) // 限制最多保存1000个书签
  }

  // 修改保存选择状态的函数
  const saveSelectionState = (
    urls: Set<string>,
    folders: Set<string>,
    expanded: Set<string>
  ) => {
    setSelectedUrls(Array.from(urls))
    setSelectedFolders(Array.from(folders))
    setExpandedFolders(Array.from(expanded))
  }

  // 修改初始化 useEffect
  useEffect(() => {
    console.log("浏览器环境:", navigator.userAgent)
    console.log("Chrome API 可用性:", !!chrome.bookmarks)
    console.log("Browser API 可用性:", !!(window as any).browser?.bookmarks)

    const bookmarksAPI = chrome.bookmarks || (window as any).browser?.bookmarks

    if (!bookmarksAPI) {
      console.error("无法获取书签 API，请检查浏览器类型和权限设置")
      return
    }

    bookmarksAPI.getTree(async (bookmarkTreeNodes) => {
      try {
        const bookmarkNodes = bookmarkTreeNodes[0].children || []
        console.log("成功获取书签树:", bookmarkNodes)
        setBookmarks(bookmarkNodes)

        const allBookmarks = getAllBookmarkUrls(bookmarkNodes)
        console.log("处理后的书签列表数量:", allBookmarks.length)

        setAllBookmarks(allBookmarks)
      } catch (error) {
        console.error("处理书签数据时出错:", error)
      }
    })
  }, [])

  const executeSearch = (engine: "google" | "bing") => {
    if (searchKeyword.trim()) {
      const searchUrl = constructSearchUrl(
        searchKeyword,
        new Set(selectedUrls),
        engine
      )
      window.open(searchUrl, "_blank")
    }
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isComposing && searchKeyword.trim()) {
      const searchUrl = constructSearchUrl(
        searchKeyword,
        new Set(selectedUrls),
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
    const urlSet = new Set(selectedUrls)
    if (urlSet.has(url)) {
      urlSet.delete(url)
    } else {
      urlSet.add(url)
    }
    setSelectedUrls(Array.from(urlSet))
  }

  const handleFolderCheckboxChange = (
    folderId: string,
    children: BookmarkItem[]
  ) => {
    const folderSet = new Set(selectedFolders)
    const urlSet = new Set(selectedUrls)

    const updateFolderAndChildren = (
      items: BookmarkItem[],
      isSelected: boolean
    ) => {
      items.forEach((item) => {
        if (item.children) {
          if (isSelected) {
            folderSet.add(item.id)
          } else {
            folderSet.delete(item.id)
          }
          updateFolderAndChildren(item.children, isSelected)
        } else if (item.url) {
          if (isSelected) {
            urlSet.add(item.url)
          } else {
            urlSet.delete(item.url)
          }
        }
      })
    }

    const isSelected = !folderSet.has(folderId)
    if (isSelected) {
      folderSet.add(folderId)
    } else {
      folderSet.delete(folderId)
    }

    updateFolderAndChildren(children, isSelected)

    setSelectedFolders(Array.from(folderSet))
    setSelectedUrls(Array.from(urlSet))
  }

  // 添加处理折叠/展开的函数
  const handleCollapsibleChange = (folderId: string, isOpen: boolean) => {
    const expandedSet = new Set(expandedFolders)
    const userExpandedSet = new Set(userExpandedFolders)
    if (isOpen) {
      expandedSet.add(folderId)
      userExpandedSet.add(folderId)
    } else {
      expandedSet.delete(folderId)
      userExpandedSet.delete(folderId)
    }
    setExpandedFolders(Array.from(expandedSet))
    setUserExpandedFolders(userExpandedSet)
  }

  // 修改 handleClearSelection，同时保留展开状态
  const handleClearSelection = () => {
    setSelectedUrls([])
    setSelectedFolders([])
    saveSelectionState(new Set(), new Set(), new Set(expandedFolders))
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
          if (selectedUrls.includes(item.url)) {
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

  // 过滤书签的函数
  const filterBookmarks = (items: BookmarkItem[]): BookmarkItem[] => {
    if (!filterKeyword.trim()) {
      // 当没有筛选关键词时，恢复到用户之前手动设置的展开状态
      setExpandedFolders(Array.from(userExpandedFolders))
      return items
    }

    const keyword = filterKeyword.toLowerCase()
    const matchedFolderIds = new Set<string>()

    const filterItem = (item: BookmarkItem): BookmarkItem | null => {
      if (item.children) {
        const filteredChildren = item.children
          .map(filterItem)
          .filter((child): child is BookmarkItem => child !== null)

        const titleMatches = item.title.toLowerCase().includes(keyword)

        if (filteredChildren.length > 0 || titleMatches) {
          // 如果文件夹包含匹配项或文件夹名称匹配，将其 ID 添加到匹配集合中
          matchedFolderIds.add(item.id)
          return { ...item, children: filteredChildren }
        }
      } else if (
        item.title.toLowerCase().includes(keyword) ||
        (item.url && item.url.toLowerCase().includes(keyword))
      ) {
        return item
      }

      return null
    }

    const filteredItems = items
      .map(filterItem)
      .filter((item): item is BookmarkItem => item !== null)

    // 更新展开的文件夹列表，添加所有包含匹配项的文件夹
    const newExpandedFolders = new Set(expandedFolders)
    matchedFolderIds.forEach((id) => newExpandedFolders.add(id))
    setExpandedFolders(Array.from(newExpandedFolders))

    return filteredItems
  }

  // 渲染书签的函数，添加展开状态控制
  const renderBookmarks = (items: BookmarkItem[]) => {
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id}>
            {item.children ? (
              <Collapsible
                className="mt-2"
                open={expandedFolders.includes(item.id)}
                onOpenChange={(isOpen) =>
                  handleCollapsibleChange(item.id, isOpen)
                }>
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
                  checked={selectedUrls.includes(item.url || "")}
                  onCheckedChange={() => handleCheckboxChange(item.url || "")}
                  className="mr-2"
                />
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "block overflow-hidden text-blue-600 truncate whitespace-nowrap text-ellipsis hover:text-blue-800 hover:underline",
                    filterKeyword.trim() &&
                      (item.title
                        .toLowerCase()
                        .includes(filterKeyword.toLowerCase()) ||
                        (item.url &&
                          item.url
                            .toLowerCase()
                            .includes(filterKeyword.toLowerCase()))) &&
                      "border-2 border-blue-300 rounded-md px-2"
                  )}>
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
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm text-gray-600">
            搜索时在侧边栏同步基于全部收藏夹搜索
          </label>
          <Switch
            checked={sidebarEnabled}
            onCheckedChange={setSidebarEnabled}
          />
        </div>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            onKeyDown={handleSearch}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="输入后按回车（Enter）搜索"
            className="flex-1 p-2 rounded-md border"
          />
          <button
            onClick={() => handleSearchEngineClick("google")}
            className={cn(
              "p-2 rounded-md border",
              searchEngine === "google" && "bg-blue-100 border-blue-300"
            )}>
            <img src={google} alt="Google" className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleSearchEngineClick("bing")}
            className={cn(
              "p-2 rounded-md border",
              searchEngine === "bing" ? "bg-blue-100 border-blue-300" : ""
            )}>
            <img src={bing} alt="Bing" className="w-5 h-5" />
          </button>
          {(selectedUrls.length > 0 || selectedFolders.length > 0) && (
            <button
              onClick={handleClearSelection}
              className="px-3 py-2 text-sm text-white bg-red-500 rounded-md hover:bg-red-600">
              清空选择
            </button>
          )}
        </div>
      </div>
      <div className="mb-4">
        <input
          type="text"
          value={filterKeywordInput}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFilterKeywordInput(e.target.value)
          }
          placeholder="筛选书签（支持标题和网址）"
          className="w-full p-2 rounded-md border"
        />
      </div>
      <div>{renderBookmarks(filterBookmarks(bookmarks))}</div>
    </div>
  )
}

export default IndexPopup
