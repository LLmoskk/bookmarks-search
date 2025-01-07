import * as tf from '@tensorflow/tfjs'
import * as use from '@tensorflow-models/universal-sentence-encoder'
import localforage from 'localforage'

export type WebPageContent = {
  url: string
  title: string
  content: string
  timestamp?: number
}

// 添加一个新的方法来清理HTML内容
function cleanHtmlContent(html: string): string {
  // 创建一个临时的div元素
  const div = document.createElement('div')
  div.innerHTML = html

  // 移除script和style标签
  const scripts = div.getElementsByTagName('script')
  const styles = div.getElementsByTagName('style')
  while(scripts[0]) scripts[0].parentNode.removeChild(scripts[0])
  while(styles[0]) styles[0].parentNode.removeChild(styles[0])

  // 返回纯文本内容
  return div.innerText.trim()
}

export class TensorVectorStore {
  private model: use.UniversalSentenceEncoder
  private documents: WebPageContent[] = []
  private vectors: tf.Tensor2D | null = null

  async initialize() {
    // 修改模型加载方式
    this.model = await use.load()

    // 从 IndexedDB 恢复数据
    const savedDocs = await localforage.getItem<WebPageContent[]>('tensor_documents')
    const savedVectors = await localforage.getItem<Float32Array>('tensor_vectors')

    if (savedDocs && savedVectors) {
      this.documents = savedDocs
      this.vectors = tf.tensor2d(savedVectors, [savedDocs.length, 512])
    }
  }

  async addDocument(doc: WebPageContent) {
    // 清理内容
    const cleanContent = cleanHtmlContent(doc.content)

    // 如果内容为空，直接返回
    if (!cleanContent) return

    const embedding = await this.model.embed(cleanContent)

    this.documents.push({
      ...doc,
      content: cleanContent
    })

    if (this.vectors === null) {
      this.vectors = embedding
    } else {
      this.vectors = tf.concat([this.vectors, embedding])
    }

    // 保存到 IndexedDB
    await localforage.setItem('tensor_documents', this.documents)
    await localforage.setItem('tensor_vectors', await this.vectors.data())
  }

  async search(query: string, k: number = 5) {
    if (!this.vectors) return []

    const queryEmbedding = await this.model.embed(query)

    // 计算余弦相似度
    const similarities = tf.matMul(
      queryEmbedding,
      this.vectors.transpose()
    )

    const values = await similarities.data()
    const indices = Array.from(values.keys())
      .sort((a, b) => values[b] - values[a])
      .slice(0, k)

    return indices.map(i => this.documents[i])
  }
}