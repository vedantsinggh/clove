export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  
  return false;
};

export const showNotification = async (sender, message) => {
  const hasPermission = await requestNotificationPermission();
  
  if (hasPermission) {
    const notification = new Notification('New message from ' + sender, {
      body: message.length > 50 ? message.substring(0, 50) + '...' : message,
      icon: '/logo192.png' // Add your app logo here
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }
};