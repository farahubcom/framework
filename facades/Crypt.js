const AES = require('crypto-js/aes');
const ENCBase64 = require('crypto-js/enc-base64');
const ENCUtf8 = require('crypto-js/enc-utf8');


class Crypt {

    /**
     * Encrypt Json object
     * 
     * @param {Object} object The object to encrypt
     * @param {string} secretKey Secret key
     * @returns 
     */
    static encryptJson = (object, secretKey) => {
        let encJson = AES.encrypt(JSON.stringify(object), secretKey).toString()
        let encData = ENCBase64.stringify(ENCUtf8.parse(encJson))
        return encData;
    }

    /**
     * Decrypt JSON object
     * 
     * @param {string} token The token to decript
     * @param {string} secretKey Secret key
     * @returns 
     */
    static decryptJson = (token, secretKey) => {
        let decData = ENCBase64.parse(token).toString(ENCUtf8)
        let bytes = AES.decrypt(decData, secretKey).toString(ENCUtf8)
        return JSON.parse(bytes);
    }
}

module.exports = Crypt;