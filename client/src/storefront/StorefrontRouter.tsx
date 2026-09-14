import { Switch, Route } from "wouter";
import { StorefrontHome } from "@/storefront/pages/StorefrontHome";
import { StorefrontShop } from "@/storefront/pages/StorefrontShop";
import { StorefrontProduct } from "@/storefront/pages/StorefrontProduct";

export function StorefrontRouter() {
  return (
    <Switch>
      <Route path="/store/:slug/products/:handle">
        {(params) => <StorefrontProduct slug={params.slug} handle={params.handle} />}
      </Route>
      <Route path="/store/:slug/shop">
        {(params) => <StorefrontShop slug={params.slug} />}
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
