'use client';

import { GoogleLogin } from '@react-oauth/google';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function GoogleSignInButton() {
  const router = useRouter();
  const [error, setError] = useState('');

  const handleSuccess = async (credentialResponse) => {
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.detail || 'Google login failed');

      localStorage.setItem('dm-token', data.accessToken);
      if (data.refreshToken) localStorage.setItem('dm-refresh-token', data.refreshToken);
      router.push('/dashboard');
    } catch (err) {
      setError(err.message || 'Google login failed. Please try again.');
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError('Google sign-in was cancelled or failed.')}
        theme="outline"
        size="large"
        width="100%"
        text="continue_with"
        shape="rectangular"
        logo_alignment="left"
      />
      {error && (
        <p className="text-red-500 dark:text-red-400 text-xs text-center">{error}</p>
      )}
    </div>
  );
}
