// server.js
require('dotenv').config(); // Load environment variables from .env file at the very top

const express = require('express');
const axios = require('axios'); // For making HTTP requests to OpenRouter

const app = express();
const port = process.env.PORT || 3000; // Use port from env or default to 3000

const openRouterApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
// Middleware to parse JSON request bodies
app.use(express.json());

// Main endpoint to generate copy using the AI Copy Agent via OpenRouter
const modelToUse = 'deepseek/deepseek-chat:free'; // <--- VERIFIED AND RECOMMENDED MODEL ID
app.post('/generate-copy', async (req, res) => {
    // Destructure properties from the request body
    // These would typically come from your frontend form/UI
    const { prompt, creativityLevel, format } = req.body;

    // Basic validation for the prompt
    if (!prompt) {
        return res.status(400).json({ success: false, error: 'Prompt is required for copy generation.' });
    }

    // Retrieve your OpenRouter API key from environment variables
    const openRouterApiKey = "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";

    // Validate if the API key is loaded
    if (!openRouterApiKey) {
        console.error("Error: OPENROUTER_API_KEY is not set in environment variables. Please check your .env file.");
        return res.status(500).json({ success: false, error: 'Server configuration error: AI API key missing.' });
    }

    // OpenRouter's universal chat completions endpoint

    // --- IMPORTANT: Choose your desired model from OpenRouter's list ---
    // 'deepseek/deepseek-chat:free' is a generally good and stable free DeepSeek model.
    // Always verify the latest available model IDs on OpenRouter.ai/models

    // Construct the messages array for the chat completion API
    // The 'system' message sets the AI's persona and general instructions
    // The 'user' message provides the actual prompt for copy generation
    const messages = [
        {
            role: "system",
            content: `You are a highly creative marketing copywriter for Funnelseye, specialized in generating compelling, concise, and persuasive content for coaches and course creators.
                      Your goal is to assist users in drafting effective marketing copy for various purposes (e.g., headlines, ad copy, emails, social media posts).
                      Consider the following constraints and preferences provided by the user:
                      - Creativity level: ${creativityLevel || 'medium'} (e.g., low, medium, high, very high). Adjust your originality and unexpectedness accordingly.
                      - Desired output format: ${format || 'standard text'} (e.g., provide 3 headline options, a short paragraph, bullet points, a call-to-action).
                      Ensure the tone is appropriate for marketing and appeals strongly to potential clients, focusing on benefits and clarity.
                      Generate content directly and avoid conversational filler like "Here is your copy:" or "I've generated the following:".`
        },
        {
            role: "user",
            content: `Generate marketing copy for the following: "${prompt}"`
        }
    ];

    try {
        // Make the POST request to OpenRouter's chat completions API
        const response = await axios.post(openRouterApiUrl, {
            model: modelToUse, // Specify the model to be used via OpenRouter
            messages: messages,
            temperature: 0.7, // Controls randomness: 0.0 (very predictable) to 1.0 (very creative). Adjust as needed.
            max_tokens: 800,  // Maximum number of tokens (roughly words/pieces of words) in the AI's response. Adjust as needed.
        }, {
            headers: {
                'Authorization': `Bearer ${openRouterApiKey}`, // Use your OpenRouter API key here
                'Content-Type': 'application/json',
                // Optional: These headers can help OpenRouter identify your app for analytics/rankings
                // 'HTTP-Referer': 'https://your-funnelseye-app.com', // Replace with your actual app URL
                // 'X-Title': 'Funnelseye AI Copy Agent Backend', // Your application's title
            }
        });

        // --- IMPORTANT DEBUGGING STEP ---
        // Log the full API response data. If content is still empty, this will tell us why.
        console.log('--- Raw OpenRouter API Response Data ---');
        console.log(JSON.stringify(response.data, null, 2));
        console.log('------------------------------------');
        // --- END DEBUGGING STEP ---

        // Extract the generated text from the API response
        // The structure `response.data.choices[0].message.content` is standard for OpenAI-compatible APIs like OpenRouter
        if (response.data && response.data.choices && response.data.choices.length > 0 &&
            response.data.choices[0].message &&
            response.data.choices[0].message.content !== undefined &&
            response.data.choices[0].message.content !== null) {
            const generatedText = response.data.choices[0].message.content;
            res.json({ success: true, generatedText: generatedText });
        } else {
            console.error('OpenRouter API response did not contain expected content or choices array was empty:', JSON.stringify(response.data, null, 2));
            res.status(500).json({ success: false, error: 'AI did not return valid content.', details: response.data || 'No data received.' });
        }


    } catch (error) {
        console.error('Error generating copy with OpenRouter:', error.response ? error.response.data : error.message);

        // Provide more detailed error information for debugging purposes
        const errorMessage = error.response
            ? error.response.data.error?.message || error.response.data.message || 'An unknown error occurred with the AI API.'
            : error.message;

        res.status(error.response?.status || 500).json({
            success: false,
            error: 'Failed to generate copy.',
            details: errorMessage,
            // You can optionally include the full error object for extensive debugging
            // (consider removing or logging less detail in production environments)
            // fullError: error.response ? error.response.data : error.message
        });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`AI Copy Agent backend listening at http://localhost:${port}`);
    console.log(`Using OpenRouter API URL: ${openRouterApiUrl}`);
    console.log(`Targeting AI Model via OpenRouter: ${modelToUse}`);
});