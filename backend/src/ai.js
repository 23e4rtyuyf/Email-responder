const OpenAI = require('openai');

const client = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

async function generateEmailResponse(inquiry, aiModel = 'gpt-4o-mini') {
  if (!client) {
    return `Thanks for reaching out. We received your request: "${inquiry}". Our team will follow up within one business day.`;
  }

  const completion = await client.responses.create({
    model: aiModel,
    input: `Write a concise and friendly business support email reply to this inquiry:\n${inquiry}`,
  });

  return completion.output_text;
}

module.exports = { generateEmailResponse };
