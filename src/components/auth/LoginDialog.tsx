// NOTE: This file is stable and usually should not be modified.
// It is important that all functionality in this file is preserved, and should only be modified if explicitly requested.

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Shield, Upload, AlertTriangle, UserPlus, KeyRound, Sparkles, Link, Loader2, Copy, Check, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLoginActions, generateNostrConnectParams, generateNostrConnectURI, NostrConnectParams } from '@/hooks/useLoginActions';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: () => void;
  onSignup?: () => void;
}

const validateNsec = (nsec: string) => {
  return /^nsec1[a-zA-Z0-9]{58}$/.test(nsec);
};

const validateBunkerUri = (uri: string) => {
  return uri.startsWith('bunker://');
};

const LoginDialog: React.FC<LoginDialogProps> = ({ isOpen, onClose, onLogin, onSignup }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isFileLoading, setIsFileLoading] = useState(false);
  const [nsec, setNsec] = useState('');
  const [bunkerUri, setBunkerUri] = useState('');
  const [errors, setErrors] = useState<{
    nsec?: string;
    bunker?: string;
    file?: string;
    extension?: string;
    connect?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const login = useLoginActions();
  const isMobile = useIsMobile();

  // NostrConnect state
  const [nostrConnectParams, setNostrConnectParams] = useState<NostrConnectParams | null>(null);
  const [nostrConnectUri, setNostrConnectUri] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isWaitingForConnect, setIsWaitingForConnect] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showBunkerInput, setShowBunkerInput] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset all state when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setIsLoading(false);
      setIsFileLoading(false);
      setNsec('');
      setBunkerUri('');
      setErrors({});
      setNostrConnectParams(null);
      setNostrConnectUri('');
      setQrCodeUrl('');
      setIsWaitingForConnect(false);
      setCopied(false);
      setShowBunkerInput(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Abort any pending connect attempt
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    }
  }, [isOpen]);

  const handleExtensionLogin = async () => {
    setIsLoading(true);
    setErrors(prev => ({ ...prev, extension: undefined }));

    try {
      if (!('nostr' in window)) {
        throw new Error('Nostr extension not found. Please install a NIP-07 extension.');
      }
      await login.extension();
      onLogin();
      onClose();
    } catch (e: unknown) {
      const error = e as Error;
      console.error('Bunker login failed:', error);
      console.error('Nsec login failed:', error);
      console.error('Extension login failed:', error);
      setErrors(prev => ({
        ...prev,
        extension: error instanceof Error ? error.message : 'Extension login failed'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const executeLogin = (key: string) => {
    setIsLoading(true);
    setErrors({});

    // Use a timeout to allow the UI to update before the synchronous login call
    setTimeout(() => {
      try {
        login.nsec(key);
        onLogin();
        onClose();
      } catch {
        setErrors({ nsec: "Failed to login with this key. Please check that it's correct." });
        setIsLoading(false);
      }
    }, 50);
  };

  const handleKeyLogin = () => {
    if (!nsec.trim()) {
      setErrors(prev => ({ ...prev, nsec: 'Please enter your secret key' }));
      return;
    }

    if (!validateNsec(nsec)) {
      setErrors(prev => ({ ...prev, nsec: 'Invalid secret key format. Must be a valid nsec starting with nsec1.' }));
      return;
    }
    executeLogin(nsec);
  };

  const handleBunkerLogin = async () => {
    if (!bunkerUri.trim()) {
      setErrors(prev => ({ ...prev, bunker: 'Please enter a bunker URI' }));
      return;
    }

    if (!validateBunkerUri(bunkerUri)) {
      setErrors(prev => ({ ...prev, bunker: 'Invalid bunker URI format. Must start with bunker://' }));
      return;
    }

    setIsLoading(true);
    setErrors(prev => ({ ...prev, bunker: undefined }));

    try {
      await login.bunker(bunkerUri);
      onLogin();
      onClose();
      // Clear the URI from memory
      setBunkerUri('');
    } catch {
      setErrors(prev => ({
        ...prev,
        bunker: 'Failed to connect to bunker. Please check the URI.'
      }));
    } finally {
      setIsLoading(false);
    }
  };

  // Generate nostrconnect session
  const generateConnectSession = useCallback(async () => {
    const relayUrl = login.getRelayUrl();
    const params = generateNostrConnectParams(relayUrl);
    const uri = generateNostrConnectURI(params, 'RelayOpti');

    setNostrConnectParams(params);
    setNostrConnectUri(uri);
    setErrors(prev => ({ ...prev, connect: undefined }));

    // Generate QR code
    try {
      const qrUrl = await QRCode.toDataURL(uri, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(qrUrl);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  }, [login]);

  // Listen for nostrconnect response
  useEffect(() => {
    if (!nostrConnectParams || !isWaitingForConnect) return;

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const connect = async () => {
      try {
        await login.nostrconnect(nostrConnectParams, abortController.signal);
        onLogin();
        onClose();
      } catch (err) {
        if (!abortController.signal.aborted) {
          console.error('Nostrconnect failed:', err);
          setErrors(prev => ({
            ...prev,
            connect: 'Connection failed or timed out. Please try again.'
          }));
          setIsWaitingForConnect(false);
        }
      }
    };

    connect();

    return () => {
      abortController.abort();
    };
  }, [nostrConnectParams, isWaitingForConnect, login, onLogin, onClose]);

  const handleStartConnect = async () => {
    await generateConnectSession();
    setIsWaitingForConnect(true);
  };

  const handleRetryConnect = async () => {
    setIsWaitingForConnect(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    await generateConnectSession();
    setIsWaitingForConnect(true);
  };

  const handleCopyUri = async () => {
    if (nostrConnectUri) {
      await navigator.clipboard.writeText(nostrConnectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenSignerApp = () => {
    if (nostrConnectUri) {
      window.location.href = nostrConnectUri;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileLoading(true);
    setErrors({});

    const reader = new FileReader();
    reader.onload = (event) => {
      setIsFileLoading(false);
      const content = event.target?.result as string;
      if (content) {
        const trimmedContent = content.trim();
        if (validateNsec(trimmedContent)) {
          executeLogin(trimmedContent);
        } else {
          setErrors({ file: 'File does not contain a valid secret key.' });
        }
      } else {
        setErrors({ file: 'Could not read file content.' });
      }
    };
    reader.onerror = () => {
      setIsFileLoading(false);
      setErrors({ file: 'Failed to read file.' });
    };
    reader.readAsText(file);
  };

  const handleSignupClick = () => {
    onClose();
    if (onSignup) {
      onSignup();
    }
  };

  const defaultTab = 'nostr' in window ? 'extension' : 'connect';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn("max-w-[95vw] sm:max-w-md max-h-[90vh] max-h-[90dvh] p-0 overflow-hidden rounded-2xl overflow-y-scroll bg-slate-900 border-white/10")}
      >
        <DialogHeader className={cn('px-6 pt-6 pb-1 relative')}>

            <DialogDescription className="text-center text-white/60">
              Sign up or log in to continue
            </DialogDescription>
        </DialogHeader>
        <div className='px-6 pt-2 pb-4 space-y-4 overflow-y-auto flex-1'>
          {/* Prominent Sign Up Section */}
          <div className='relative p-4 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 overflow-hidden'>
            <div className='relative z-10 text-center space-y-3'>
              <div className='flex justify-center items-center gap-2 mb-2'>
                <Sparkles className='w-5 h-5 text-violet-400' />
                <span className='font-semibold text-white'>
                  New to Nostr?
                </span>
              </div>
              <p className='text-sm text-white/70'>
                Create a new account to get started. It's free and open.
              </p>
              <Button
                onClick={handleSignupClick}
                className='w-full rounded-full py-3 text-base font-semibold bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 transform transition-all duration-200 hover:scale-105 shadow-lg shadow-violet-500/25 border-0 text-white'
              >
                <UserPlus className='w-4 h-4 mr-2' />
                <span>Sign Up</span>
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className='relative'>
            <div className='absolute inset-0 flex items-center'>
              <div className='w-full border-t border-white/10'></div>
            </div>
            <div className='relative flex justify-center text-sm'>
              <span className='px-3 bg-slate-900 text-white/50'>
                <span>Or log in</span>
              </span>
            </div>
          </div>

          {/* Login Methods */}
          <Tabs
            defaultValue={defaultTab}
            className="w-full"
            onValueChange={(value) => {
              if (value === 'connect' && !nostrConnectParams) {
                handleStartConnect();
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10 rounded-lg mb-4">
              <TabsTrigger value="extension" className="flex items-center gap-2 text-white/70 data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                <Shield className="w-4 h-4" />
                <span>Extension</span>
              </TabsTrigger>
              <TabsTrigger value="key" className="flex items-center gap-2 text-white/70 data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                <KeyRound className="w-4 h-4" />
                <span>Key</span>
              </TabsTrigger>
              <TabsTrigger value="connect" className="flex items-center gap-2 text-white/70 data-[state=active]:bg-violet-500 data-[state=active]:text-white">
                <Link className="w-4 h-4" />
                <span>Connect</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value='extension' className='space-y-3'>
              {errors.extension && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errors.extension}</AlertDescription>
                </Alert>
              )}
              <div className='text-center p-4 rounded-lg bg-white/5 border border-white/10'>
                <Shield className='w-12 h-12 mx-auto mb-3 text-violet-400' />
                <p className='text-sm text-white/60 mb-4'>
                  Login with one click using the browser extension
                </p>
                <div className="flex justify-center">
                  <Button
                    className='w-full rounded-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white'
                    onClick={handleExtensionLogin}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Logging in...' : 'Login with Extension'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='key' className='space-y-4'>
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <label htmlFor='nsec' className='text-sm font-medium text-white/80'>
                    Secret Key (nsec)
                  </label>
                  <Input
                    id='nsec'
                    type="password"
                    value={nsec}
                    onChange={(e) => {
                      setNsec(e.target.value);
                      if (errors.nsec) setErrors(prev => ({ ...prev, nsec: undefined }));
                    }}
                    className={`rounded-lg bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-violet-500 ${
                      errors.nsec ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                    placeholder='nsec1...'
                    autoComplete="off"
                  />
                  {errors.nsec && (
                    <p className="text-sm text-red-400">{errors.nsec}</p>
                  )}
                </div>

                <Button
                  className='w-full rounded-full py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white'
                  onClick={handleKeyLogin}
                  disabled={isLoading || !nsec.trim()}
                >
                  {isLoading ? 'Verifying...' : 'Log In'}
                </Button>

                <div className='relative'>
                  <div className='absolute inset-0 flex items-center'>
                    <div className='w-full border-t border-white/10'></div>
                  </div>
                  <div className='relative flex justify-center text-xs'>
                    <span className='px-2 bg-slate-900 text-white/50'>
                      or
                    </span>
                  </div>
                </div>

                <div className='text-center'>
                  <input
                    type='file'
                    accept='.txt'
                    className='hidden'
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant='outline'
                    className='w-full border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading || isFileLoading}
                  >
                    <Upload className='w-4 h-4 mr-2' />
                    {isFileLoading ? 'Reading File...' : 'Upload Your Key File'}
                  </Button>
                  {errors.file && (
                    <p className="text-sm text-red-400 mt-2">{errors.file}</p>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value='connect' className='space-y-3'>
              {errors.connect && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{errors.connect}</AlertDescription>
                </Alert>
              )}

              <div className='text-center p-4 rounded-lg bg-white/5 border border-white/10'>
                {!nostrConnectParams ? (
                  <div className="flex flex-col items-center gap-4">
                    <Link className='w-12 h-12 text-violet-400' />
                    <p className='text-sm text-white/60'>
                      Connect with a remote signer app like Amber or nsec.app
                    </p>
                    <Button
                      className='w-full rounded-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white'
                      onClick={handleStartConnect}
                    >
                      Generate Connection
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    {/* QR Code - Desktop only */}
                    {!isMobile && qrCodeUrl && (
                      <div className="bg-white p-2 rounded-lg">
                        <img
                          src={qrCodeUrl}
                          alt="NostrConnect QR Code"
                          className="w-48 h-48"
                        />
                      </div>
                    )}

                    {/* Status */}
                    {isWaitingForConnect && (
                      <div className="flex items-center gap-2 text-sm text-white/50">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Waiting for signer...</span>
                      </div>
                    )}

                    {/* Open Signer App - Mobile */}
                    {isMobile && (
                      <Button
                        className='w-full rounded-full py-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white'
                        onClick={handleOpenSignerApp}
                        disabled={!nostrConnectUri}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Open Signer App
                      </Button>
                    )}

                    {/* Copy URI button */}
                    <Button
                      variant="outline"
                      className='w-full border-white/20 text-white/70 hover:bg-white/10 hover:text-white'
                      onClick={handleCopyUri}
                      disabled={!nostrConnectUri}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Connection String
                        </>
                      )}
                    </Button>

                    {/* Retry button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-white/50 hover:text-white hover:bg-white/10"
                      onClick={handleRetryConnect}
                    >
                      Generate New Code
                    </Button>
                  </div>
                )}

                {/* Collapsible Manual Bunker Input */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowBunkerInput(!showBunkerInput)}
                    className="flex items-center justify-center gap-2 w-full text-sm text-white/50 hover:text-white transition-colors"
                  >
                    {showBunkerInput ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                    Manual bunker connection
                  </button>

                  {showBunkerInput && (
                    <div className="mt-3 space-y-3">
                      <Input
                        id='bunkerUri'
                        value={bunkerUri}
                        onChange={(e) => {
                          setBunkerUri(e.target.value);
                          if (errors.bunker) setErrors(prev => ({ ...prev, bunker: undefined }));
                        }}
                        className={`rounded-lg bg-white/5 border-white/20 text-white placeholder:text-white/40 focus-visible:ring-violet-500 ${errors.bunker ? 'border-red-500' : ''}`}
                        placeholder='bunker:// or nostrconnect://'
                        autoComplete="off"
                      />
                      {errors.bunker && (
                        <p className="text-sm text-red-400">{errors.bunker}</p>
                      )}
                      <Button
                        className='w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 text-white'
                        onClick={handleBunkerLogin}
                        disabled={isLoading || !bunkerUri.trim()}
                      >
                        {isLoading ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
    );
  };

export default LoginDialog;
