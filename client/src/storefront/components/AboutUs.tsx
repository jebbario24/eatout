export interface AboutUsFields {
  heading: string;
  body: string;
  imageUrl?: string | null;
}

export function AboutUs({ fields }: { fields: AboutUsFields }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8" data-testid="section-about-us">
      <div className="grid items-center gap-10 md:grid-cols-2">
        {fields.imageUrl && (
          <div className="aspect-[4/3] overflow-hidden rounded-lg bg-muted">
            <img src={fields.imageUrl} alt={fields.heading} className="h-full w-full object-cover" />
          </div>
        )}
        <div className={fields.imageUrl ? "" : "mx-auto max-w-2xl text-center"}>
          <h2 className="font-display text-2xl font-bold sm:text-3xl">{fields.heading}</h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">{fields.body}</p>
        </div>
      </div>
    </div>
  );
}
