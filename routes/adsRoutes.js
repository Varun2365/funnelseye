const express = require('express');
const router = express.Router();
const adsController = require('../controllers/adsController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Campaign management routes
router.get('/', adsController.listCampaigns);
router.post('/create', adsController.createCampaign);
router.post('/sync', adsController.syncCampaigns);
router.put('/:campaignId', adsController.updateCampaign);
router.post('/:campaignId/pause', adsController.pauseCampaign);
router.post('/:campaignId/resume', adsController.resumeCampaign);
router.get('/:campaignId/analytics', adsController.getCampaignAnalytics);

// New routes for complete URL campaign creation
router.post('/upload-image', adsController.uploadImage);
router.post('/:campaignId/ad-sets', adsController.createAdSet);
router.post('/:campaignId/creatives', adsController.createAdCreative);
router.post('/:campaignId/ads', adsController.createAd);
router.get('/:campaignId/ad-sets', adsController.listAdSets);
router.get('/:campaignId/creatives', adsController.listAdCreatives);
router.get('/:campaignId/ads', adsController.listAds);

// All-in-one URL campaign creation
router.post('/create-url-campaign', adsController.createUrlCampaign);

module.exports = router;
