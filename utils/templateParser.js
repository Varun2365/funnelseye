// D:\PRJ_YCT_Final\utils\templateParser.js

/**
 * Parses a template string and replaces variables with values from data.
 * Variables should be in {{path.to.value}} format.
 *
 * @param {string} templateString - The string containing variables (e.g., "Hello {{leadData.firstName}}").
 * @param {object} data - The data object to extract values from (e.g., eventData).
 * @returns {string} The parsed string with variables replaced.
 */
const parseTemplateString = (templateString, data) => {
    if (typeof templateString !== 'string') {
        return templateString; // Return as is if not a string
    }

    return templateString.replace(/\{\{(.*?)\}\}/g, (match, path) => {
        // Trim whitespace from the path
        const trimmedPath = path.trim();

        // Safely get nested value using a reduce function
        const value = trimmedPath.split('.').reduce((obj, key) => {
            return obj && typeof obj === 'object' && key in obj ? obj[key] : undefined;
        }, data);

        // If value is found, return it, otherwise return the original placeholder
        return value !== undefined ? value : match;
    });
};

module.exports = {
    parseTemplateString
};