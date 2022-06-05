import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';
dotenv.config();
export const encrypt = (data: string) => {
	return CryptoJS.AES.encrypt(data, process.env.ENCRYPTION_KEY).toString();
};
export const decrypt = (data: string) => {
	return CryptoJS.AES.decrypt(data, process.env.ENCRYPTION_KEY).toString(
		CryptoJS.enc.Utf8,
	);
};
