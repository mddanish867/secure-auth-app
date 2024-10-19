import Anthropic from "@anthropic-ai/sdk";

export default async function handler(req, res) {
    console.log("API Request received:", req.method); // Log the request method

    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
    });

    try {
        const { prompt } = req.body;
        console.log("Prompt received:", prompt); // Log the prompt data

        const completion = await anthropic.completions.create({
            model: 'claude-3-opus-20240229',
            max_tokens_to_sample: 1000,
            prompt: `Human: ${prompt}\n\nAssistant:`,
        });
        res.status(200).json({ result: completion.completion });
    } catch (error) {
        console.error('Detailed Error:', error.response?.data || error.message || error);
        res.status(500).json({ message: 'Error generating the content', error: error.message });
    }
}
