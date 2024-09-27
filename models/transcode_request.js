const { sequelize } = require('./index');

// Define TranscodeRequest model
const TranscodeRequest = sequelize.define('TranscodeRequest', {
    fileName: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
    },
});

// Add a new TranscodeRequest
async function addTranscodeRequest(fileName, status) {
    try {
        await sequelize.sync(); // Sync models with database

        const newRequest = await TranscodeRequest.create({
            fileName,
            status,
        });

        console.log('New TranscodeRequest added:', newRequest.toJSON());
    } catch (error) {
        console.error('Error adding TranscodeRequest:', error);
    }
}

