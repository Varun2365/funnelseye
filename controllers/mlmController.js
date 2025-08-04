const Coach = require('../schema/coachSchema');

const addDownline = async (req, res) => {
    const { name, email, password, sponsorId } = req.body;

    if (!email || !password || !name || !sponsorId) {
        return res.status(400).json({ msg: 'Please enter all required fields: name, email, password, and sponsorId.' });
    }

    try {
        const sponsor = await Coach.findById(sponsorId);
        if (!sponsor) {
            return res.status(404).json({ msg: 'Sponsor not found. Cannot add to downline.' });
        }
        
        let coach = await Coach.findOne({ email });
        if (coach) {
            return res.status(400).json({ msg: 'Coach with this email already exists.' });
        }

        const newCoach = new Coach({
            name,
            email,
            password,
            sponsorId
        });
        
        await newCoach.save();

        res.status(201).json({
            msg: 'Coach successfully added to downline!',
            coachId: newCoach._id,
            sponsorId: newCoach.sponsorId
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

const getDownline = async (req, res) => {
    const { sponsorId } = req.params;

    try {
        const downline = await Coach.find({ sponsorId }).select('-password -__v');
        
        if (downline.length === 0) {
            return res.status(404).json({ msg: 'No downline found for this coach.' });
        }

        res.status(200).json({
            msg: 'Downline retrieved successfully.',
            downline: downline
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

const getDownlineHierarchy = async (req, res) => {
    const { coachId } = req.params;

    try {
        const sponsor = await Coach.findById(coachId);
        if (!sponsor) {
            return res.status(404).json({ msg: 'Sponsor not found.' });
        }

        const hierarchy = await Coach.aggregate([
            { $match: { _id: sponsor._id } },
            {
                $graphLookup: {
                    from: 'users',
                    startWith: '$_id',
                    connectFromField: '_id',
                    connectToField: 'sponsorId',
                    as: 'downlineHierarchy',
                    depthField: 'level'
                }
            },
            {
                $project: {
                    // Include the main sponsor's fields
                    _id: 1,
                    name: 1,
                    email: 1,
                    age: 1,
                    bio: 1,
                    company: 1,
                    phone: 1,
                    country: 1,
                    city: 1,
                    role: 1,
                    profilePictureUrl: 1,
                    isActive: 1,
                    isVerified: 1,
                    lastLogin: 1,
                    lastActiveAt: 1,
                    downlineHierarchy: {
                        $map: {
                            input: "$downlineHierarchy",
                            as: "downlineMember",
                            in: {
                                // Include all the desired fields for downline members
                                _id: "$$downlineMember._id",
                                name: "$$downlineMember.name",
                                email: "$$downlineMember.email",
                                age: "$$downlineMember.age",
                                bio: "$$downlineMember.bio",
                                company: "$$downlineMember.company",
                                phone: "$$downlineMember.phone",
                                country: "$$downlineMember.country",
                                city: "$$downlineMember.city",
                                role: "$$downlineMember.role",
                                profilePictureUrl: "$$downlineMember.profilePictureUrl",
                                isActive: "$$downlineMember.isActive",
                                isVerified: "$$downlineMember.isVerified",
                                lastLogin: "$$downlineMember.lastLogin",
                                lastActiveAt: "$$downlineMember.lastActiveAt",
                            }
                        }
                    }
                }
            }
        ]);

        if (!hierarchy || hierarchy.length === 0) {
            return res.status(404).json({ msg: 'No downline hierarchy found.' });
        }
        
        res.status(200).json({
            msg: 'Downline hierarchy retrieved successfully.',
            hierarchy: hierarchy[0].downlineHierarchy
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

module.exports = {
    addDownline,
    getDownline,
    getDownlineHierarchy
};