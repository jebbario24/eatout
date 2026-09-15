import { Switch, Route } from "wouter";
import { StorefrontHome } from "@/storefront/pages/StorefrontHome";
import { StorefrontShop } from "@/storefront/pages/StorefrontShop";
import { StorefrontProduct } from "@/storefront/pages/StorefrontProduct";
import { StorefrontPage } from "@/storefront/pages/StorefrontPage";
import { StorefrontContact } from "@/storefront/pages/StorefrontContact";
import { StorefrontCart } from "@/storefront/pages/StorefrontCart";
import { StorefrontCheckout } from "@/storefront/pages/StorefrontCheckout";
import { StorefrontOrderConfirmation } from "@/storefront/pages/StorefrontOrderConfirmation";

export function StorefrontRouter() {
  return (
    <Switch>
      <Route path="/store/:slug/products/:handle">
        {(params) => <StorefrontProduct slug={params.slug} handle={params.handle} />}
      </Route>
      <Route path="/store/:slug/shop">
        {(params) => <StorefrontShop slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/cart">
        {(params) => <StorefrontCart slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/checkout">
        {(params) => <StorefrontCheckout slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/order/:orderId">
        {(params) => <StorefrontOrderConfirmation slug={params.slug} orderId={params.orderId} />}
      </Route>
      <Route path="/store/:slug/contact">
        {(params) => <StorefrontContact slug={params.slug} />}
      </Route>
      <Route path="/store/:slug/pages/:handle">
        {(params) => <StorefrontPage slug={params.slug} handle={params.handle} />}
      </Route>
      <Route path="/store/:slug">
        {(params) => <StorefrontHome slug={params.slug} />}
      </Route>
      <Route>
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">Store not found</div>
      </Route>
    </Switch>
  );
}
