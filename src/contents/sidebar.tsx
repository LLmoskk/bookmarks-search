import cssText from "data-text:~/contents/sidebar.css"
import type { PlasmoCSConfig } from "plasmo"
import { useEffect, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"
import { Storage } from "@plasmohq/storage"
import { useStorage } from "@plasmohq/storage/hook"

import "./sidebar-base.css"

import { constructSearchUrl } from "../utils"

export const config: PlasmoCSConfig = {
  matches: [
    "https://*.google.com/search*",
    "https://*.google.com.hk/search*",
    "https://*.google.co.jp/search*",
    "https://*.google.co.uk/search*",
    "https://*.google.de/search*",
    "https://*.google.fr/search*",
    "https://*.google.it/search*",
    "https://*.google.es/search*",
    "https://*.google.ca/search*",
    "https://*.google.com.br/search*",
    "https://*.google.com.au/search*",
    "https://*.google.co.in/search*",
    "https://*.bing.com/search*"
  ],
  all_frames: false,
  run_at: "document_end"
}

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const getShadowHostId = () => "plasmo-google-sidebar"

type BookmarkItem = {
  id: string
  title: string
  url?: string
  children?: BookmarkItem[]
}

const Sidebar = () => {
  const [searchResults, setSearchResults] = useState<
    Array<{ url: string; title: string }>
  >([])
  const [currentKeyword, setCurrentKeyword] = useState("")
  const storage = new Storage({
    area: "local"
  })
  const [allBookmarks] = useStorage(
    {
      key: "allBookmarks",
      instance: storage
    },
    []
  )
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [sidebarEnabled] = useStorage<boolean>("sidebarEnabled", true)

  const getSearchKeyword = () => {
    const searchParams = new URLSearchParams(window.location.search)
    const keyword = searchParams.get("q")
    if (keyword) {
      setCurrentKeyword(keyword)
    }
  }

  const fetchSearchResults = async (
    keyword: string,
    allBookmarks: BookmarkItem[]
  ) => {
    if (allBookmarks.length === 0) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    try {
      const engine = window.location.hostname.includes("google")
        ? "google"
        : "bing"
      const allUrl = allBookmarks.map((item) => item.url)
      const searchUrl = constructSearchUrl(keyword, new Set(allUrl), engine)

      // 使用消息传递来发送请求不然有 CORS
      const response = await sendToBackground({
        name: "fetch-search",
        body: {
          searchUrl
        }
      })

      if (response.error) {
        throw new Error(response.error)
      }

      const html = response.html

      const parser = new DOMParser()
      const doc = parser.parseFromString(html, "text/html")

      const results = []
      if (engine === "google") {
        const items = doc.querySelectorAll("div.g")
        items.forEach((item) => {
          const titleEl = item.querySelector("h3")
          const linkEl = item.querySelector("a")
          if (titleEl && linkEl) {
            results.push({
              title: titleEl.textContent,
              url: linkEl.href
            })
          }
        })
      } else {
        const items = doc.querySelectorAll("li.b_algo")
        items.forEach((item) => {
          const titleEl = item.querySelector("h2")
          const linkEl = item.querySelector("a")
          if (titleEl && linkEl) {
            results.push({
              title: titleEl.textContent,
              url: linkEl.href
            })
          }
        })
      }

      setSearchResults(results)
    } catch (error) {
      console.error("获取搜索结果失败:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    getSearchKeyword()
    fetchSearchResults(currentKeyword, allBookmarks)
  }, [currentKeyword, allBookmarks])

  if (!sidebarEnabled) {
    return null
  }

  return (
    <div id="sidebar" className={isExpanded ? "open" : "closed"}>
      <button
        className="toggle-button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-label={isExpanded ? "收起侧边栏" : "展开侧边栏"}>
        {isExpanded ? "›" : "‹"}
      </button>
      <div className="sidebar-content">
        <h2 className="sidebar-title">当前搜索关键词: {currentKeyword}</h2>
        <div className="sidebar-title">在全部收藏夹网站中查询结果</div>
        {allBookmarks.length === 0 ? (
          <p className="no-sites">正在加载收藏夹...</p>
        ) : (
          <>
            {isLoading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p className="loading">正在搜索中...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <ul>
                {searchResults.map((result, index) => (
                  <li key={index}>
                    <a
                      className="search-result-item"
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer">
                      <span className="result-title">{result.title}</span>
                      <span className="result-url">{result.url}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p>收藏夹范围内的网址未检索到相关内容</p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default Sidebar
