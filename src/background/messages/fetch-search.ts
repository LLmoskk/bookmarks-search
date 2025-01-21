import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { searchUrl } = req.body

  try {
    const response = await fetch(searchUrl)
    const html = await response.text()
    res.send({
      html
    })
  } catch (error) {
    res.send({
      error: error.message
    })
  }
}

export default handler