const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET_KEY;

const generateToken = (payload) => {
    const token = jwt.sign(payload, secretKey, { expiresIn: '1h' });
  
    return token;
};
  
const getRefrshToken = (payload) => {
    const token = jwt.sign(payload, secretKey, { expiresIn: '7d' });
  
    return token;
};

const refreshToken = (token) => {
    try {
      const decoded = jwt.verify(token, secretKey);
      
      const payload = {
        email: decoded.email,
      };
      
      const newToken = generateToken(payload);
      return newToken;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return null;
    }
};
  
const addDaysToDate = (currentDate, daysToAdd) => {
    daysToAdd = daysToAdd || 0
    const futureDate = new Date(currentDate)
    futureDate.setDate(futureDate.getDate() + daysToAdd)
  
    return futureDate
}

const get_login = (payload) => {
    const accessToken = generateToken(payload);
    const refreshToken =getRefrshToken(payload);
    // const expiredAt = addDaysToDate(new Date(),7);
    const expiredAt = Date.now() + 3000000;
    const res_data = {
        accessToken,
        refreshToken,
        expiredAt
    };
    return res_data;
}

module.exports = { generateToken, refreshToken, getRefrshToken, get_login };