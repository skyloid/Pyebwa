import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface QueueItem {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  retryCount: number;
}

export const useOfflineQueue = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    try {
      const storedQueue = await AsyncStorage.getItem('offline_queue');
      if (storedQueue) {
        setQueue(JSON.parse(storedQueue));
      }
    } catch (error) {
      console.error('Error loading queue:', error);
    }
  };

  const saveQueue = async (newQueue: QueueItem[]) => {
    try {
      await AsyncStorage.setItem('offline_queue', JSON.stringify(newQueue));
      setQueue(newQueue);
    } catch (error) {
      console.error('Error saving queue:', error);
    }
  };

  const addToQueue = async (type: string, data: any) => {
    const newItem: QueueItem = {
      id: `${Date.now()}_${Math.random()}`,
      type,
      data,
      timestamp: new Date(),
      retryCount: 0,
    };

    const updatedQueue = [...queue, newItem];
    await saveQueue(updatedQueue);
    
    // Try to process immediately if online
    processQueue();
  };

  const processQueue = async () => {
    if (isProcessing || queue.length === 0) return;

    setIsProcessing(true);
    
    try {
      // Process items in queue
      const updatedQueue = [...queue];
      
      for (let i = 0; i < updatedQueue.length; i++) {
        const item = updatedQueue[i];
        
        try {
          // Simulate API call
          console.log(`Processing queue item: ${item.type}`, item.data);
          
          // Remove successful item from queue
          updatedQueue.splice(i, 1);
          i--; // Adjust index after removal
          
        } catch (error) {
          // Increment retry count
          item.retryCount++;
          
          // Remove if too many retries
          if (item.retryCount > 3) {
            updatedQueue.splice(i, 1);
            i--;
          }
        }
      }
      
      await saveQueue(updatedQueue);
      
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearQueue = async () => {
    await saveQueue([]);
  };

  return {
    queue,
    addToQueue,
    processQueue,
    clearQueue,
    isProcessing,
  };
};