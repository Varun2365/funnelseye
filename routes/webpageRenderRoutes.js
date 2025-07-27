// D:\PRJ_YCT_Final\routes\webpageRenderRoutes.js

const express = require('express');
const Funnel = require('../schema/Funnel'); // Adjust this path if your Funnel model is elsewhere
const asyncHandler = require('../middleware/async'); // Assuming you have this

const router = express.Router();

// @desc    Render a specific page within a funnel using slugs
// @route   GET /funnels/:funnelSlug/:pageSlug
// @access  Public
router.get('/:funnelSlug/:pageSlug', asyncHandler(async (req, res, next) => {
    const { funnelSlug, pageSlug } = req.params;

    // 1. Find the funnel using the funnelSlug (which maps to funnelUrl in your schema)
    const funnel = await Funnel.findOne({ funnelUrl: funnelSlug, isActive: true });

    if (!funnel) {
        // If the funnel isn't found or is not active,
        // simply call next() to pass control to the next middleware (your 404 handler in main.js)
        return next(); 
    }

    // 2. Find the specific stage (page) within this funnel's stages array
    // The pageSlug maps to the pageId in your stageSchema
    const stage = funnel.stages.find(s => s.pageId === pageSlug && s.isEnabled);

    if (!stage) {
        // If the page isn't found within the funnel or is disabled,
        // simply call next() to pass control to the next middleware (your 404 handler in main.js)
        return next();
    }

    // 3. Construct the full HTML document using the data from the stage
    const basicInfo = stage.basicInfo || {}; 

    const fullHtmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${basicInfo.title || stage.name || 'FunnelsEye Page'}</title>
    ${basicInfo.description ? `<meta name="description" content="${basicInfo.description}">` : ''}
    ${basicInfo.keywords ? `<meta name="keywords" content="${basicInfo.keywords}">` : ''}
    ${basicInfo.favicon ? `<link rel="icon" href="${basicInfo.favicon}">` : ''}
    
    ${basicInfo.socialTitle ? `<meta property="og:title" content="${basicInfo.socialTitle}">` : ''}
    ${basicInfo.socialDescription ? `<meta property="og:description" content="${basicInfo.socialDescription}">` : ''}
    ${basicInfo.socialImage ? `<meta property="og:image" content="${basicInfo.socialImage}">` : ''}
    <meta property="og:type" content="website">
    
    ${basicInfo.customHtmlHead || ''}

    <style>
        /* CSS from the saved stage */
        ${stage.css}
    </style>
</head>
<body>
    ${stage.html}

    ${basicInfo.customHtmlBody || ''}

    <script>
        // JavaScript from the saved stage
        ${stage.js}
    </script>
</body>
</html>
    `;

    // 4. Set the Content-Type header to 'text/html' and send the response
    res.set('Content-Type', 'text/html');
    res.send(fullHtmlContent);
}));

module.exports = router;