/**
 * ============================================================
 * src/components/UserReviewsPanel.tsx - Comentarios en el perfil
 * ============================================================
 * Muestra las valoraciones que escribió el usuario y las recibidas
 * en sus eventos (con opción de responder).
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Review } from '../types';
import { getCreatorReviews, getMyReviews, replyToReview } from '../lib/api';
import { StarRatingDisplay } from './StarRating';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Link } from 'react-router-dom';
import { Loader2, Reply, MessageSquare, MessageSquareText, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';

const parseDate = (d: any): Date | null => {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (d.toDate && typeof d.toDate === 'function') return d.toDate();
  if (d.seconds && d.nanoseconds) return new Date(d.seconds * 1000);
  const parsed = new Date(d);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const formatShortDate = (d: any): string => {
  const date = parseDate(d);
  return date ? format(date, "d 'de' MMM yyyy", { locale: es }) : '';
};

const getEventImage = (r: Review): string =>
  r.event?.cover_image || r.event?.image_url || 'https://picsum.photos/seed/mood/200/120';

const ReplyBlock: React.FC<{ reply: string | null | undefined; repliedBy?: string | null }> = ({ reply, repliedBy }) => {
  if (!reply) return null;
  return (
    <div className="mt-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
      <p className="text-xs font-semibold text-primary mb-1">
        <Reply size={12} className="inline mr-1" />
        Respuesta {repliedBy ? `de ${repliedBy}` : 'del organizador'}
      </p>
      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{reply}</p>
    </div>
  );
};

export const UserReviewsPanel: React.FC = () => {
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [creatorReviews, setCreatorReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, creator] = await Promise.all([getMyReviews(), getCreatorReviews()]);
      setMyReviews(mine);
      setCreatorReviews(creator);
    } catch (err) {
      console.error('Error loading user reviews:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleReply = async (reviewId: string) => {
    setReplyingId(reviewId);
    try {
      await replyToReview(reviewId, replyText.trim());
      toast.success('Respuesta enviada');
      setReplyOpen(null);
      setReplyText('');
      await load();
    } catch (err: any) {
      toast.error(err?.message || 'Error al responder');
    } finally {
      setReplyingId(null);
    }
  };

  const MyReviewItem: React.FC<{ r: Review }> = ({ r }) => (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
      <img src={getEventImage(r)} alt="" className="h-14 w-20 rounded-lg object-cover flex-shrink-0" referrerPolicy="no-referrer" />
      <div className="flex-1 min-w-0">
        <Link to={`/event/${r.event_id}`} className="font-semibold text-card-foreground hover:text-primary transition-colors line-clamp-1 block">
          {r.event?.title || r.event_id}
        </Link>
        <div className="flex items-center gap-2 mt-1">
          <StarRatingDisplay value={r.rating} size={14} />
          <span className="text-xs font-semibold text-muted-foreground">{r.rating}/10</span>
          {r.created_at && <span className="text-xs text-muted-foreground ml-auto">{formatShortDate(r.created_at)}</span>}
        </div>
        {r.comment && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 whitespace-pre-line line-clamp-2">{r.comment}</p>}
        {r.reply ? (
          <ReplyBlock reply={r.reply} repliedBy={r.replied_by_name} />
        ) : (
          <p className="text-xs text-muted-foreground mt-2">Sin respuesta aún</p>
        )}
      </div>
    </div>
  );

  const CreatorReviewItem: React.FC<{ r: Review }> = ({ r }) => (
    <div className="p-3 rounded-xl border border-border bg-card">
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage src={r.author_photo || ''} />
          <AvatarFallback className="bg-primary/15 text-primary">{r.author_name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-card-foreground">{r.author_name || 'Usuario'}</span>
            <StarRatingDisplay value={r.rating} size={14} />
            <span className="text-xs text-muted-foreground">{r.rating}/10</span>
            {r.created_at && <span className="text-xs text-muted-foreground ml-auto">{formatShortDate(r.created_at)}</span>}
          </div>
          <Link to={`/event/${r.event_id}`} className="text-xs text-primary hover:underline mt-0.5 inline-block">
            {r.event?.title || r.event_id}
          </Link>
          {r.comment && <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 whitespace-pre-line">{r.comment}</p>}
          <ReplyBlock reply={r.reply} repliedBy={r.replied_by_name} />

          <div className="mt-2">
            {replyOpen === r.id ? (
              <div className="space-y-2">
                <Textarea rows={2} placeholder="Respondé esta valoración..." value={replyText} onChange={e => setReplyText(e.target.value)} />
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" onClick={() => { setReplyOpen(null); setReplyText(''); }}>Cancelar</Button>
                  <Button size="sm" className="bg-primary text-primary-foreground" disabled={replyingId === r.id || !replyText.trim()} onClick={() => handleReply(r.id)}>
                    {replyingId === r.id && <Loader2 size={14} className="mr-1 animate-spin" />}
                    {r.reply ? 'Actualizar respuesta' : 'Responder'}
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="text-primary" onClick={() => { setReplyOpen(r.id); setReplyText(r.reply || ''); }}>
                <Reply size={14} className="mr-1" />
                {r.reply ? 'Editar respuesta' : 'Responder'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare size={18} className="text-primary" />
            Mis Comentarios
          </CardTitle>
          <CardDescription>
            {myReviews.length} {myReviews.length === 1 ? 'valoración' : 'valoraciones'} que escribiste
          </CardDescription>
        </CardHeader>
        <CardContent>
          {myReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Todavía no valoraste ningún evento.</p>
          ) : (
            <div className="space-y-3">
              {myReviews.map(r => <MyReviewItem key={r.id} r={r} />)}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareText size={18} className="text-primary" />
            Comentarios en mis eventos
          </CardTitle>
          <CardDescription>
            Valoraciones que recibieron tus eventos ({creatorReviews.length})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {creatorReviews.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-3">Todavía no recibiste valoraciones en tus eventos.</p>
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <Calendar size={12} /> Cuando alguien valore tus eventos, lo verás acá.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {creatorReviews.map(r => <CreatorReviewItem key={r.id} r={r} />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
