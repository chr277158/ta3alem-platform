'use client';

import { useState } from 'react';

const AVATARS = [
  { id: 'robot', name: 'الروبوت الذكي', color: 'bg-blue-500', icon: '🤖' },
  { id: 'astronaut', name: 'رائد الفضاء', color: 'bg-gray-200', icon: '👨‍🚀' },
  { id: 'wizard', name: 'الساحر الحكيم', color: 'bg-purple-500', icon: '🧙‍♂️' },
  { id: 'animal', name: 'البطل الشجاع', color: 'bg-orange-500', icon: '🦁' },
];

interface AvatarSelectorProps {
  currentAvatar: string;
  userId: string;
  onUpdate: () => void;
}

export default function AvatarSelector({ currentAvatar, userId, onUpdate }: AvatarSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (avatarId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/avatar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, avatar: avatarId })
      });
      
      if (res.ok) {
        localStorage.setItem('userAvatar', avatarId);
        onUpdate();
        setIsOpen(false);
      }
    } catch (error) {
      console.error('Error updating avatar:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl shadow-md hover:shadow-lg transition-all border-2 border-blue-100"
      >
        <span className="text-2xl">{AVATARS.find(a => a.id === currentAvatar)?.icon || '🤖'}</span>
        <span className="font-bold text-gray-700">تغيير الشخصية</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-2xl w-full animate-bounce-in">
            <h2 className="text-3xl font-bold text-center mb-6">🎭 اختر رفيق مغامرتك</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar.id}
                  onClick={() => handleSelect(avatar.id)}
                  disabled={loading}
                  className={`p-6 rounded-2xl border-4 transition-all transform hover:scale-105 ${
                    currentAvatar === avatar.id 
                      ? 'border-yellow-400 bg-yellow-50 shadow-lg' 
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className={`w-16 h-16 mx-auto rounded-full ${avatar.color} flex items-center justify-center text-3xl mb-3 shadow-inner`}>
                    {avatar.icon}
                  </div>
                  <div className="font-bold text-gray-800">{avatar.name}</div>
                  {currentAvatar === avatar.id && (
                    <div className="mt-2 text-green-600 text-sm font-bold">✅ الحالي</div>
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
}