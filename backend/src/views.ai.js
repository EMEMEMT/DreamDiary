import { Router } from 'express'

export const aiRouter = Router()

// 统一使用 OpenAI 兼容的 Chat Completions 接口，便于对接国内大模型（Kimi/月之暗面、通义千问、豆包等）
const LLM_BASE_URL = process.env.LLM_BASE_URL || ''
const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_MODEL = process.env.LLM_MODEL || ''
const LLM_COMPLETIONS_PATH = process.env.LLM_COMPLETIONS_PATH || '/v1/chat/completions'

aiRouter.post('/interpret', async (req, res) => {
  try {
    const { content, tags = [] } = req.body || {}
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ message: 'content 必填' })
    }

    if (!LLM_BASE_URL || !LLM_API_KEY || !LLM_MODEL) {
      return res.status(500).json({ message: '服务器未配置大模型环境变量' })
    }

    const systemPrompt = [
      '你是一个专业的中文梦境解读助手，具备心理学与象征学素养。',
      '基于用户提供的梦境内容进行温和、理性的分析。',
      '输出请使用清晰的分段与小标题，涵盖：',
      '1) 梦境概要  2) 主要意象与可能象征  3) 核心情绪与潜在需求  4) 生活启示与建议  5) 注意事项（非医疗建议，不做诊断）。',
      '避免玄学或绝对化结论，强调因人而异与自我观察。'
    ].join('\n')

    const userPrompt = [
      `梦境内容：\n${content}`,
      tags?.length ? `相关标签：${tags.join(', ')}` : ''
    ].filter(Boolean).join('\n\n')

    const url = `${LLM_BASE_URL.replace(/\/$/, '')}${LLM_COMPLETIONS_PATH}`
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        stream: false
      })
    })

    if (!resp.ok) {
      const text = await resp.text().catch(() => '')
      return res.status(502).json({ message: `LLM 请求失败: ${resp.status}`, detail: text })
    }
    const data = await resp.json()

    const output = data?.choices?.[0]?.message?.content || ''
    if (!output) {
      return res.status(502).json({ message: 'LLM 返回空结果' })
    }

    return res.json({ interpretation: output, model: LLM_MODEL })
  } catch (err) {
    console.error('AI interpret error:', err)
    return res.status(500).json({ message: '服务器错误' })
  }
})


