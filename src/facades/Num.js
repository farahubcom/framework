class Num {

    /**
     * Check if a string is a valid number
     * 
     * @param {String} str string to validate
     * @returns {Boolean}
     */
    static isNumeric = (str) => {
        if (typeof str != "string") return false;
        return !isNaN(str) && !isNaN(parseFloat(str))
    }
}

module.exports = Num;