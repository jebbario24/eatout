import { useEffect } from "react";
import { Helmet } from "react-helmet";

interface PixelScriptsProps {
  metaPixelId?: string;
  tiktokPixelId?: string;
  googleAnalyticsId?: string;
  googleAdsId?: string;
  metaVerificationCode?: string;
}

export function PixelScripts({
  metaPixelId,
  tiktokPixelId,
  googleAnalyticsId,
  googleAdsId,
  metaVerificationCode,
}: PixelScriptsProps) {
  useEffect(() => {
    // Meta Pixel initialization
    if (metaPixelId && typeof window !== 'undefined') {
      (function(f: any,b: any,e: any,v: any,n?: any,t?: any,s?: any){
        if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)
      })(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      (window as any).fbq('init', metaPixelId);
      (window as any).fbq('track', 'PageView');
    }

    // TikTok Pixel initialization
    if (tiktokPixelId && typeof window !== 'undefined') {
      (function (w: any, d: any, t: any) {
        w.TiktokAnalyticsObject = t;
        var ttq = w[t] = w[t] || [];
        ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
        ttq.setAndDefer = function (t: any, e: any) {
          t[e] = function () {
            t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
          }
        };
        for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
        ttq.instance = function (t: any) {
          for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
          return e
        };
        ttq.load = function (e: any, n: any) {
          var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
          ttq._i = ttq._i || {};
          ttq._i[e] = [];
          ttq._i[e]._u = i;
          ttq._t = ttq._t || {};
          ttq._t[e] = +new Date;
          ttq._o = ttq._o || {};
          ttq._o[e] = n || {};
          var o = document.createElement("script");
          o.type = "text/javascript";
          o.async = !0;
          o.src = i + "?sdkid=" + e + "&lib=" + t;
          var a = document.getElementsByTagName("script")[0];
          a.parentNode!.insertBefore(o, a)
        };
        ttq.load(tiktokPixelId);
        ttq.page();
      })(window, document, 'ttq');
    }

    // Google Analytics 4 and Google Ads initialization
    if ((googleAnalyticsId || googleAdsId) && typeof window !== 'undefined') {
      // Initialize dataLayer and gtag globally (only once)
      (window as any).dataLayer = (window as any).dataLayer || [];
      if (!(window as any).gtag) {
        (window as any).gtag = function(...args: any[]) {
          (window as any).dataLayer.push(arguments);
        };
        (window as any).gtag('js', new Date());
      }

      // Load Google Analytics 4 script
      if (googleAnalyticsId) {
        const gaScript = document.createElement('script');
        gaScript.async = true;
        gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`;
        document.head.appendChild(gaScript);
        (window as any).gtag('config', googleAnalyticsId);
      }

      // Load Google Ads script (reuse the same gtag loader if GA is already present)
      if (googleAdsId) {
        if (!googleAnalyticsId) {
          const adsScript = document.createElement('script');
          adsScript.async = true;
          adsScript.src = `https://www.googletagmanager.com/gtag/js?id=${googleAdsId}`;
          document.head.appendChild(adsScript);
        }
        (window as any).gtag('config', googleAdsId);
      }
    }
  }, [metaPixelId, tiktokPixelId, googleAnalyticsId, googleAdsId]);

  return (
    <Helmet>
      {/* Meta Domain Verification */}
      {metaVerificationCode && (
        <meta name="facebook-domain-verification" content={metaVerificationCode} />
      )}
      
      {/* Noscript fallback for Meta Pixel */}
      {metaPixelId && (
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src={`https://www.facebook.com/tr?id=${metaPixelId}&ev=PageView&noscript=1`}
            alt=""
          />
        </noscript>
      )}
    </Helmet>
  );
}

// Helper function to track events across all pixels
export function trackPixelEvent(
  eventName: string,
  eventData?: any,
  pixelConfig?: {
    metaPixelId?: string;
    tiktokPixelId?: string;
    googleAnalyticsId?: string;
    googleAdsId?: string;
  }
) {
  if (typeof window === 'undefined') return;

  // Meta Pixel event
  if (pixelConfig?.metaPixelId && (window as any).fbq) {
    (window as any).fbq('track', eventName, eventData);
  }

  // TikTok Pixel event
  if (pixelConfig?.tiktokPixelId && (window as any).ttq) {
    (window as any).ttq.track(eventName, eventData);
  }

  // Google Analytics 4 event
  if (pixelConfig?.googleAnalyticsId && (window as any).gtag) {
    (window as any).gtag('event', eventName, eventData);
  }

  // Google Ads event
  if (pixelConfig?.googleAdsId && (window as any).gtag) {
    (window as any).gtag('event', eventName, {
      ...eventData,
      send_to: pixelConfig.googleAdsId,
    });
  }
}

// E-commerce event helpers
export function trackViewContent(itemData: { id: string; name: string; price: number; currency: string }, pixelConfig?: any) {
  trackPixelEvent('ViewContent', {
    content_ids: [itemData.id],
    content_name: itemData.name,
    content_type: 'product',
    value: itemData.price,
    currency: itemData.currency,
  }, pixelConfig);
}

export function trackAddToCart(itemData: { id: string; name: string; price: number; currency: string; quantity?: number }, pixelConfig?: any) {
  trackPixelEvent('AddToCart', {
    content_ids: [itemData.id],
    content_name: itemData.name,
    content_type: 'product',
    value: itemData.price,
    currency: itemData.currency,
    num_items: itemData.quantity || 1,
  }, pixelConfig);
}

export function trackInitiateCheckout(cartData: { value: number; currency: string; items: any[] }, pixelConfig?: any) {
  trackPixelEvent('InitiateCheckout', {
    content_ids: cartData.items.map(item => item.id),
    value: cartData.value,
    currency: cartData.currency,
    num_items: cartData.items.reduce((sum, item) => sum + (item.quantity || 1), 0),
  }, pixelConfig);
}

export function trackPurchase(orderData: { orderId: string; value: number; currency: string; items: any[] }, pixelConfig?: any) {
  trackPixelEvent('Purchase', {
    content_ids: orderData.items.map(item => item.id),
    value: orderData.value,
    currency: orderData.currency,
    transaction_id: orderData.orderId,
    num_items: orderData.items.reduce((sum, item) => sum + (item.quantity || 1), 0),
  }, pixelConfig);
}
