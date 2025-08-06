
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const sanitizeInput = (input) => {
  if (typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/['"]/g, '')
    .replace(/\0/g, '')
    .replace(/[\r\n\t]/g, ' ')
    .substring(0, 1000);
};

export const sanitizeEmail = (email) => {
  if (typeof email !== 'string') {
    return '';
  }
  
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>"']/g, '')
    .substring(0, 254);
};

export const validateAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 1000000;
};

export const validateTransactionHash = (hash) => {
  const hashRegex = /^0x[a-fA-F0-9]{64}$/;
  return hashRegex.test(hash);
};
