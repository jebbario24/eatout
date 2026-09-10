import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";

export function DebugAuthInfo() {
  const { user, isAuthenticated } = useAuth();

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <Card className="border-orange-500 bg-orange-50 dark:bg-orange-900/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          Debug: Auth Information
        </CardTitle>
        <CardDescription className="text-xs">
          Remove this component in production
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-medium">Authenticated:</span>
          {isAuthenticated ? (
            <Badge variant="default" className="text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Yes
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              <XCircle className="h-3 w-3 mr-1" />
              No
            </Badge>
          )}
        </div>
        
        {user && (
          <>
            <div className="flex items-center gap-2">
              <span className="font-medium">Email:</span>
              <code className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">
                {user.email}
              </code>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">Role:</span>
              <code className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">
                {user.role || 'undefined'}
              </code>
              {user.role !== 'driver' && (
                <Badge variant="destructive" className="text-xs ml-2">
                  Should be "driver"!
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="font-medium">User ID:</span>
              <code className="bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded text-xs">
                {user.id}
              </code>
            </div>

            {user.role !== 'driver' && (
              <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                <p className="text-red-800 dark:text-red-200 font-medium">
                  ⚠️ Role Mismatch!
                </p>
                <p className="text-red-700 dark:text-red-300 mt-1">
                  Your account role is "{user.role}" but should be "driver" to access driver endpoints.
                  This is causing 403 errors.
                </p>
              </div>
            )}
          </>
        )}

        <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
          <p>Full user object (check console):</p>
          <button
            onClick={() => console.log('User object:', user)}
            className="mt-1 px-2 py-1 bg-primary/10 hover:bg-primary/20 rounded text-primary text-xs"
          >
            Log to Console
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
