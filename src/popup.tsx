import { useEffect, useState } from "react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible"
import { ChevronRight } from "lucide-react"

import { TensorVectorStore } from "./storage/tensorStore"

import "@/styles/style.css"

// 定义书签项的类型
type BookmarkItem = {
  id: string
  title: string
  url?: string
  children?: BookmarkItem[]
}

type ProcessStatus = {
  total: number
  processed: number
  status: "idle" | "processing" | "completed" | "error"
}

function IndexPopup() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [processStatus, setProcessStatus] = useState<ProcessStatus>({
    total: 0,
    processed: 0,
    status: "idle"
  })
  const [vectorStore, setVectorStore] = useState<TensorVectorStore | null>(null)

  // 初始化向量存储
  useEffect(() => {
    const initVectorStore = async () => {
      const store = new TensorVectorStore()
      await store.initialize()
      setVectorStore(store)
    }
    initVectorStore()
  }, [])

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

  // 处理书签内容
  const processBookmarks = async () => {
    if (!vectorStore) return

    const bookmarkUrls = getAllBookmarkUrls(bookmarks)
    console.log("处理的书签:", bookmarkUrls)

    setProcessStatus({
      total: bookmarkUrls.length,
      processed: 0,
      status: "processing"
    })

    try {
      for (let i = 0; i < bookmarkUrls.length; i++) {
        const { url, title } = bookmarkUrls[i]

        try {
          // 使用 chrome.tabs API 创建一个新标签页来获取内容
          const tab = await chrome.tabs.create({ url, active: false })

          // 等待页面加载完成
          await new Promise<void>((resolve) => {
            const listener = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
              if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener)
                resolve()
              }
            }
            chrome.tabs.onUpdated.addListener(listener)
          })

          // 注入并执行内容脚本
          const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id! },
            func: () => {
              // 移除所有脚本和样式标签
              const scripts = document.getElementsByTagName('script')
              const styles = document.getElementsByTagName('style')
              Array.from(scripts).forEach(script => script.remove())
              Array.from(styles).forEach(style => style.remove())

              // 获取主要内容
              const content = document.body.innerText
              return content.trim()
            }
          })

          // 关闭标签页
          await chrome.tabs.remove(tab.id!)

          if (result?.result) {
            // 添加到向量存储
            await vectorStore.addDocument({
              url,
              title,
              content: result.result
            })
          }

          setProcessStatus((prev) => ({
            ...prev,
            processed: i + 1
          }))
        } catch (err) {
          console.error(`处理书签 ${url} 时出错:`, err)
          // 继续处理下一个书签
          continue
        }
      }

      setProcessStatus((prev) => ({
        ...prev,
        status: "completed"
      }))
    } catch (error) {
      console.error("处理书签时出错:", error)
      setProcessStatus((prev) => ({
        ...prev,
        status: "error"
      }))
    }
  }

  useEffect(() => {
    // 获取所有书签
    chrome.bookmarks.getTree((bookmarkTreeNodes) => {
      // 使用第一个根节点的子节点
      setBookmarks(bookmarkTreeNodes[0].children || [])
    })
  }, [])

  // 渲染进度状态
  const renderStatus = () => {
    if (processStatus.status === "idle") return null

    return (
      <div className="mt-4">
        <p>
          处理进度: {processStatus.processed} / {processStatus.total}
        </p>
        <p>
          状态:{" "}
          {processStatus.status === "processing"
            ? "处理中..."
            : processStatus.status === "completed"
              ? "完成"
              : processStatus.status === "error"
                ? "出错"
                : ""}
        </p>
      </div>
    )
  }

  // 修改渲染书签的函数
  const renderBookmarks = (items: BookmarkItem[]) => {
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="pl-2">
            {item.children ? (
              <Collapsible>
                <div className="flex gap-1 items-center">
                  <CollapsibleTrigger className="p-1 rounded-sm hover:bg-gray-100">
                    <ChevronRight className="w-4 h-4" />
                  </CollapsibleTrigger>
                  <span className="font-medium text-gray-700">{item.title}</span>
                </div>
                <CollapsibleContent className="pl-4">
                  {renderBookmarks(item.children)}
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <div className="flex gap-1 items-center pl-6">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 hover:underline">
                  {item.title}
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
      <button
        className="px-4 py-2 text-white bg-blue-500 rounded hover:bg-blue-600 disabled:bg-gray-400"
        onClick={processBookmarks}
        disabled={processStatus.status === "processing"}>
        开始处理书签内容
      </button>
      {renderStatus()}
      <div className="mt-4">
        {renderBookmarks(bookmarks)}
      </div>
    </div>
  )
}

export default IndexPopup
