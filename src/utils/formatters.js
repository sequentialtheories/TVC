export const formatCurrency = (amount, decimals = 2) => {
  const num = parseFloat(amount)
  if (isNaN(num)) return '$0.00'
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

export const formatNumber = (number, decimals = 2) => {
  const num = parseFloat(number)
  if (isNaN(num)) return '0'
  
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num)
}

export const formatPercentage = (value, decimals = 1) => {
  const num = parseFloat(value)
  if (isNaN(num)) return '0%'
  
  return `${num.toFixed(decimals)}%`
}

export const formatAddress = (address, startChars = 6, endChars = 4) => {
  if (!address) return ''
  if (address.length <= startChars + endChars) return address
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

export const formatTimeRemaining = (endTime) => {
  const now = Date.now() / 1000
  const remaining = endTime - now
  
  if (remaining <= 0) return 'Completed'
  
  const days = Math.floor(remaining / (24 * 60 * 60))
  const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((remaining % (60 * 60)) / 60)
  
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export const formatLockPeriod = (lockPeriodSeconds) => {
  const days = Math.floor(lockPeriodSeconds / (24 * 60 * 60))
  const months = Math.floor(days / 30)
  const years = Math.floor(days / 365)
  
  if (years > 0) {
    const remainingMonths = Math.floor((days % 365) / 30)
    return remainingMonths > 0 ? `${years}y ${remainingMonths}m` : `${years}y`
  }
  
  if (months > 0) {
    const remainingDays = days % 30
    return remainingDays > 0 ? `${months}m ${remainingDays}d` : `${months}m`
  }
  
  return `${days}d`
}

export const generateChartPoints = (currentValue, type) => {
  const points = []
  const baseValue = currentValue
  for (let i = 0; i < 10; i++) {
    const x = 10 + (i * 18)
    const variation = (Math.random() - 0.5) * 0.2
    const y = 30 - ((baseValue + variation) / baseValue) * 10
    points.push(`${x},${Math.max(5, Math.min(35, y))}`)
  }
  return points.join(' ')
}
