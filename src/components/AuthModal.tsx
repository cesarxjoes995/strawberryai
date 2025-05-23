import React, { useState } from 'react';
import { X, LogIn } from 'lucide-react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { cn } from '../lib/utils';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [authView, setAuthView] = useState<'signin' | 'signup'>('signup'); // Default to signup
  const [slideOut, setSlideOut] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setSlideOut(true);
    setTimeout(() => {
      setSlideOut(false);
      onClose(); 
    }, 200);
  };

  // Define appearance for Clerk components to match your UI
  const clerkAppearance = {
    baseTheme: undefined, // Use Clerk's default dark theme or customize further
    variables: {
      colorPrimary: '#a855f7', // Purple
      colorText: '#ffffff',
      colorBackground: '#141414',
      colorInputBackground: '#1A1A1A',
      colorInputText: '#ffffff',
      colorShimmer: 'rgba(168, 85, 247, 0.1)',
      borderRadius: '0.75rem', // 12px
      // You can add more variables here to match your theme
    },
    elements: {
      card: {
        backgroundColor: '#141414',
        border: '1px solid #232323',
        boxShadow: 'none',
      },
      headerTitle: {
        color: '#ffffff',
      },
      headerSubtitle: {
         color: '#a1a1aa', // gray-400
      },
      socialButtonsBlockButton:{
        borderColor: '#232323',
        backgroundColor: '#1A1A1A',
        '&:hover': {
            backgroundColor: '#232323',
        }
      },
      dividerLine: {
        backgroundColor: '#232323'
      },
      dividerText: {
        color: '#a1a1aa' // gray-400
      },
      formFieldLabel: {
        color: '#e5e7eb' // gray-200
      },
      formFieldInput: {
        backgroundColor: '#1A1A1A',
        borderColor: '#232323',
        color: '#ffffff',
        '&:focus': {
            borderColor: '#a855f7'
        }
      },
      formButtonPrimary: {
        backgroundImage: 'linear-gradient(to right, #a855f7, #ec4899)', // purple-500 to pink-500
        '&:hover': {
            backgroundImage: 'linear-gradient(to right, #9333ea, #db2777)' // purple-600 to pink-600
        }
      },
      footerActionText: {
        color: '#a1a1aa' // gray-400
      },
      footerActionLink: {
        color: '#a855f7', // purple-500
        '&:hover': {
            color: '#9333ea' // purple-600
        }
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in-50 duration-300">
      <div 
        className={cn(
            "relative bg-[#141414] rounded-2xl border border-[#232323] shadow-2xl overflow-hidden transition-all duration-300 w-full max-w-md",
            slideOut ? "animate-out slide-out-to-bottom-12 fade-out-0" : "animate-in slide-in-from-bottom-12 fade-in-0"
        )}
      >
        <button 
          onClick={handleClose}
          className="absolute right-4 top-4 p-2 hover:bg-[#232323] rounded-full transition-all duration-200 hover:rotate-90 z-10"
        >
          <X className="h-5 w-5 text-gray-400" />
        </button>

        <div className="p-8 pt-12">
          {authView === 'signup' ? (
            <SignUp 
              signInUrl="/sign-in" 
              path="/sign-up" 
              routing="path" 
              appearance={clerkAppearance} 
              afterSignUpUrl="/"
              afterSignInUrl="/"
            />
          ) : (
            <SignIn 
              signUpUrl="/sign-up" 
              path="/sign-in" 
              routing="path" 
              appearance={clerkAppearance} 
              afterSignUpUrl="/"
              afterSignInUrl="/"
            />
          )}
        </div>
      </div>
    </div>
  );
}