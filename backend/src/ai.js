const OpenAI = require('openai');

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function generateEmailResponse(inquiry, aiModel = 'gpt-4o-mini') {
  if (!client) {
    return `Thanks for reaching out. We received your request: "${inquiry}". Our team will follow up within one business day.`;
  }

  const completion = await client.chat.completions.create({
    model: aiModel,
    messages: [
      {
        role: 'system',
        content: 'You are a concise and friendly customer support assistant.',
      },
      {
        role: 'user',
        content: `Write a concise and friendly business support email reply to this inquiry:\n${inquiry}`,
      },
    ],
  });

  return (
    completion.choices?.[0]?.message?.content ||
    'Thanks for your message. We will get back to you shortly.'
  );
}

module.exports = { generateEmailResponse };
