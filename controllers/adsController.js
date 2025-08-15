const AdCampaign = require('../schema/AdCampaign');
const AdSet = require('../schema/AdSet');
const AdCreative = require('../schema/AdCreative');
const Ad = require('../schema/Ad');
const metaAdsService = require('../services/metaAdsService');

// List all campaigns for a coach
async function listCampaigns(req, res) {
    const coachId = req.user.id;
    const campaigns = await AdCampaign.find({ coachId });
    res.json({ success: true, data: campaigns });
}

// Create a new campaign
async function createCampaign(req, res) {
    const coachMetaAccountId = req.body.coachMetaAccountId;
    const campaignData = req.body.campaignData;
    const data = await metaAdsService.createCampaign(coachMetaAccountId, campaignData);
    res.json({ success: true, data });
}

// Update a campaign
async function updateCampaign(req, res) {
    const { campaignId } = req.params;
    const updateData = req.body;
    const data = await metaAdsService.updateCampaign(campaignId, updateData);
    res.json({ success: true, data });
}

// Pause a campaign
async function pauseCampaign(req, res) {
    const { campaignId } = req.params;
    const data = await metaAdsService.pauseCampaign(campaignId);
    res.json({ success: true, data });
}

// Resume a campaign
async function resumeCampaign(req, res) {
    const { campaignId } = req.params;
    const data = await metaAdsService.resumeCampaign(campaignId);
    res.json({ success: true, data });
}

// Fetch analytics/insights for a campaign
async function getCampaignAnalytics(req, res) {
    const { campaignId } = req.params;
    const data = await metaAdsService.fetchCampaignInsights(campaignId);
    res.json({ success: true, data });
}

// Sync campaigns from Meta to DB
async function syncCampaigns(req, res) {
    const coachId = req.user.id;
    const coachMetaAccountId = req.body.coachMetaAccountId;
    await metaAdsService.syncCampaignsToDB(coachId, coachMetaAccountId);
    res.json({ success: true });
}

// New controllers for complete URL campaign creation

// Upload image and get image hash
async function uploadImage(req, res) {
    try {
        const { imageUrl } = req.body;
        
        if (!imageUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required field: imageUrl' 
            });
        }

        const result = await metaAdsService.uploadImage(imageUrl);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Create ad set for targeting and budget
async function createAdSet(req, res) {
    try {
        const { campaignId } = req.params;
        const adSetData = req.body;
        
        if (!adSetData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required field: adSetData' 
            });
        }

        const result = await metaAdsService.createAdSet(campaignId, adSetData);
        
        // Save to local database
        await AdSet.findOneAndUpdate(
            { adSetId: result.id, coachId: req.user.id },
            {
                coachId: req.user.id,
                campaignId,
                adSetId: result.id,
                name: adSetData.name,
                status: adSetData.status || 'DRAFT',
                targeting: adSetData.targeting,
                daily_budget: adSetData.daily_budget,
                lifetime_budget: adSetData.lifetime_budget,
                billing_event: adSetData.billing_event,
                optimization_goal: adSetData.optimization_goal,
                start_time: adSetData.start_time,
                end_time: adSetData.end_time,
                lastSynced: new Date(),
                metaRaw: result
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Create ad creative with image and text
async function createAdCreative(req, res) {
    try {
        const { campaignId } = req.params;
        const creativeData = req.body;
        
        if (!creativeData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required field: creativeData' 
            });
        }

        const result = await metaAdsService.createAdCreative(campaignId, creativeData);
        
        // Save to local database
        await AdCreative.findOneAndUpdate(
            { creativeId: result.id, coachId: req.user.id },
            {
                coachId: req.user.id,
                campaignId,
                creativeId: result.id,
                name: creativeData.name,
                status: 'ACTIVE',
                object_story_spec: creativeData.object_story_spec,
                image_hash: creativeData.object_story_spec?.link_data?.image_hash,
                image_url: creativeData.image_url,
                link: creativeData.object_story_spec?.link_data?.link,
                message: creativeData.object_story_spec?.link_data?.message,
                call_to_action: creativeData.object_story_spec?.link_data?.call_to_action,
                lastSynced: new Date(),
                metaRaw: result
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Create ad that combines ad set and creative
async function createAd(req, res) {
    try {
        const { campaignId } = req.params;
        const adData = req.body;
        
        if (!adData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required field: adData' 
            });
        }

        const result = await metaAdsService.createAd(campaignId, adData);
        
        // Save to local database
        await Ad.findOneAndUpdate(
            { adId: result.id, coachId: req.user.id },
            {
                coachId: req.user.id,
                campaignId,
                adSetId: adData.adset_id,
                adId: result.id,
                creativeId: adData.creative?.creative_id,
                name: adData.name,
                status: adData.status || 'DRAFT',
                adset_id: adData.adset_id,
                creative: adData.creative,
                lastSynced: new Date(),
                metaRaw: result
            },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// List ad sets for a campaign
async function listAdSets(req, res) {
    try {
        const { campaignId } = req.params;
        const adSets = await AdSet.find({ campaignId, coachId: req.user.id });
        res.json({ success: true, data: adSets });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// List ad creatives for a campaign
async function listAdCreatives(req, res) {
    try {
        const { campaignId } = req.params;
        const adCreatives = await AdCreative.find({ campaignId, coachId: req.user.id });
        res.json({ success: true, data: adCreatives });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// List ads for a campaign
async function listAds(req, res) {
    try {
        const { campaignId } = req.params;
        const ads = await Ad.find({ campaignId, coachId: req.user.id });
        res.json({ success: true, data: ads });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

// Create complete URL campaign (all-in-one)
async function createUrlCampaign(req, res) {
    try {
        const { 
            coachMetaAccountId, 
            campaignData, 
            adSetData, 
            creativeData, 
            adData 
        } = req.body;
        
        if (!coachMetaAccountId || !campaignData || !adSetData || !creativeData || !adData) {
            return res.status(400).json({ 
                success: false, 
                error: 'Missing required fields' 
            });
        }

        // Step 1: Create campaign
        const campaign = await metaAdsService.createCampaign(coachMetaAccountId, campaignData);
        
        // Step 2: Create ad set
        const adSet = await metaAdsService.createAdSet(campaign.id, adSetData);
        
        // Step 3: Create ad creative
        const creative = await metaAdsService.createAdCreative(campaign.id, creativeData);
        
        // Step 4: Create ad
        const ad = await metaAdsService.createAd(campaign.id, {
            ...adData,
            adset_id: adSet.id,
            creative: { creative_id: creative.id }
        });

        res.json({ 
            success: true, 
            data: {
                campaign,
                adSet,
                creative,
                ad
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}

module.exports = {
    listCampaigns,
    createCampaign,
    updateCampaign,
    pauseCampaign,
    resumeCampaign,
    getCampaignAnalytics,
    syncCampaigns,
    uploadImage,
    createAdSet,
    createAdCreative,
    createAd,
    listAdSets,
    listAdCreatives,
    listAds,
    createUrlCampaign
};
