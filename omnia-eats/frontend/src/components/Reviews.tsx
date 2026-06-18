import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Star, Loader2, LogIn } from 'lucide-react';
import { fetchReviews, createReview } from '@/lib/api';
import { GlassCard } from '@/components/ui/GlassCard';

function Stars({ value, onChange, size = 'h-5 w-5' }: { value: number; onChange?: (n: number) => void; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          type="button"
          key={n}
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          data-cursor={onChange ? 'hover' : undefined}
          className={onChange ? 'transition-transform hover:scale-110' : 'cursor-default'}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star className={`${size} ${n <= value ? 'fill-amber-400 text-amber-400' : 'text-white/25'}`} />
        </button>
      ))}
    </div>
  );
}

/** Customer reviews — public list + a star-rating form for signed-in users. */
export function Reviews({ vendorId }: { vendorId: string }) {
  const qc = useQueryClient();
  const { data: reviews = [], isLoading } = useQuery({ queryKey: ['reviews', vendorId], queryFn: () => fetchReviews(vendorId) });
  const count = reviews.length;
  const avg = count ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10 : undefined;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [needAuth, setNeedAuth] = useState(false);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: () => createReview(vendorId, { rating, comment: comment.trim() || undefined }),
    onSuccess: (res) => {
      if (res.needAuth) return setNeedAuth(true);
      if (res.ok) {
        setComment('');
        setDone(true);
        void qc.invalidateQueries({ queryKey: ['reviews', vendorId] });
      }
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-2xl font-bold tracking-tight">Customer reviews</h3>
        {avg != null && (
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {avg} · {count} reviews
          </span>
        )}
      </div>

      <GlassCard className="mt-4 p-5">
        {done ? (
          <p className="text-sm text-emerald-500">Thanks — your review was posted!</p>
        ) : needAuth ? (
          <Link to="/sign-in" className="inline-flex items-center gap-2 text-sm text-accent-soft hover:underline" data-cursor="hover">
            <LogIn className="h-4 w-4" /> Sign in to leave a review
          </Link>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/60">Your rating</span>
              <Stars value={rating} onChange={setRating} />
            </div>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              maxLength={600}
              placeholder="How was the food?"
              className="w-full resize-none rounded-2xl border border-[var(--color-border)] bg-white/[0.04] p-3 text-sm outline-none transition-colors focus:border-accent/40"
            />
            <button
              type="submit"
              disabled={mutation.isPending}
              className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#c2410c,#f97316)] px-5 py-2.5 text-sm font-semibold text-[#fff] transition-transform hover:scale-[1.02] disabled:opacity-60"
              data-cursor="hover"
            >
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Post review
            </button>
          </form>
        )}
      </GlassCard>

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-6 text-white/40"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : reviews.length === 0 ? (
          <p className="py-2 text-sm text-white/40">No reviews yet — be the first.</p>
        ) : (
          reviews.map((r) => (
            <GlassCard key={r.id} className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{r.authorName}</span>
                <Stars value={r.rating} size="h-3.5 w-3.5" />
              </div>
              {r.comment && <p className="mt-1.5 text-sm leading-relaxed text-white/60">{r.comment}</p>}
              <p className="mt-1 text-xs text-white/35">{new Date(r.createdAt).toLocaleDateString()}</p>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
