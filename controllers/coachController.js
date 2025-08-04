const Coach = require('../schema/coachSchema');

const updateCoachProfile = async (req, res) => {
    const { id } = req.params;
    const { headline, bio, experienceYears, specializations } = req.body;

    try {
        const updatedCoach = await Coach.findByIdAndUpdate(
            id,
            {
                $set: {
                    'portfolio.headline': headline,
                    'portfolio.bio': bio,
                    'portfolio.experienceYears': experienceYears,
                    'portfolio.specializations': specializations
                }
            },
            {
                new: true,
                runValidators: true
            }
        );

        if (!updatedCoach) {
            return res.status(404).json({ success: false, message: 'Coach not found.' });
        }

        res.status(200).json({
            success: true,
            message: 'Coach profile updated successfully.',
            data: updatedCoach
        });

    } catch (error) {
        console.error('Error updating coach profile:', error.message);
        res.status(500).json({ success: false, message: 'Server error during profile update.' });
    }
};

module.exports = {
    updateCoachProfile
};