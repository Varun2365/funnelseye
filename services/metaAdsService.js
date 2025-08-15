const axios = require('axios');
const AdCampaign = require('../schema/AdCampaign');
const AdSet = require('../schema/AdSet');
const AdCreative = require('../schema/AdCreative');
const Ad = require('../schema/Ad');

const META_ADS_API_BASE = 'https://graph.facebook.com/v19.0';
const ACCESS_TOKEN = process.env.META_ADS_ACCESS_TOKEN;

async function fetchCampaigns(coachMetaAccountId) {
    // Fetch campaigns for a given Meta Ad Account
    const url = `${META_ADS_API_BASE}/act_${coachMetaAccountId}/campaigns?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.get(url);
    return data;
}

async function fetchCampaignInsights(campaignId) {
    // Fetch analytics/insights for a campaign
    const url = `${META_ADS_API_BASE}/${campaignId}/insights?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.get(url);
    return data;
}

async function createCampaign(coachMetaAccountId, campaignData) {
    // Create a new campaign
    const url = `${META_ADS_API_BASE}/act_${coachMetaAccountId}/campaigns?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.post(url, campaignData);
    return data;
}

async function updateCampaign(campaignId, updateData) {
    // Update campaign settings
    const url = `${META_ADS_API_BASE}/${campaignId}?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.post(url, updateData);
    return data;
}

async function pauseCampaign(campaignId) {
    return updateCampaign(campaignId, { status: 'PAUSED' });
}

async function resumeCampaign(campaignId) {
    return updateCampaign(campaignId, { status: 'ACTIVE' });
}

// New methods for complete URL campaign creation
async function createAdSet(campaignId, adSetData) {
    // Create an ad set for targeting and budget
    const url = `${META_ADS_API_BASE}/act_${campaignId}/adsets?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.post(url, adSetData);
    return data;
}

async function createAdCreative(campaignId, creativeData) {
    // Create an ad creative with image and text
    const url = `${META_ADS_API_BASE}/act_${campaignId}/adcreatives?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.post(url, creativeData);
    return data;
}

async function createAd(campaignId, adData) {
    // Create an ad that combines ad set and creative
    const url = `${META_ADS_API_BASE}/act_${campaignId}/ads?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.post(url, adData);
    return data;
}

async function uploadImage(imageUrl) {
    // Upload image to Meta and get image hash
    const url = `${META_ADS_API_BASE}/me/adimages?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.post(url, { url: imageUrl });
    return data;
}

async function fetchAdSets(campaignId) {
    // Fetch ad sets for a campaign
    const url = `${META_ADS_API_BASE}/${campaignId}/adsets?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.get(url);
    return data;
}

async function fetchAdCreatives(campaignId) {
    // Fetch ad creatives for a campaign
    const url = `${META_ADS_API_BASE}/${campaignId}/adcreatives?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.get(url);
    return data;
}

async function fetchAds(campaignId) {
    // Fetch ads for a campaign
    const url = `${META_ADS_API_BASE}/${campaignId}/ads?access_token=${ACCESS_TOKEN}`;
    const { data } = await axios.get(url);
    return data;
}

async function syncCampaignsToDB(coachId, coachMetaAccountId) {
    // Fetch and upsert all campaigns for a coach
    const campaigns = await fetchCampaigns(coachMetaAccountId);
    for (const c of campaigns.data) {
        await AdCampaign.findOneAndUpdate(
            { campaignId: c.id, coachId },
            { name: c.name, status: c.status, objective: c.objective, lastSynced: new Date(), metaRaw: c },
            { upsert: true, new: true }
        );
    }
    return true;
}

module.exports = {
    fetchCampaigns,
    fetchCampaignInsights,
    createCampaign,
    updateCampaign,
    pauseCampaign,
    resumeCampaign,
    createAdSet,
    createAdCreative,
    createAd,
    uploadImage,
    fetchAdSets,
    fetchAdCreatives,
    fetchAds,
    syncCampaignsToDB
};
