/**
 * ============================================================
 * src/components/EventReviews.tsx - Comentarios y valoraciones
 * ============================================================
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Review } from '../types';
import { createReview, deleteReview, getEventReviews, replyToReview } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { StarRatingDisplay, StarRatingInput } from './StarRating';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Loader2, Reply, Trash2, LogIn, Star } from 'lucide-react';
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

interface EventReviewsProps {
  eventId: string;
  canReply: boolean;
}

export const EventReviews: React.FC<EventReviewsProps> = ({ eventId, canReply }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editing, setEditing] = useState(false);

  const [replyOpen, setReplyOpen] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getEventReviews(eventId);
      setReviews(list);
    } catch (err) {
      console.error('Error loading reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const myReview = reviews.find(r => user && r.user_id === user.uid);
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await createReview(eventId, rating, comment.trim() || undefined);
      toast.success(editing ? 'Valoración actualizada' : '¡Gracias por tu valoración!');
      setEditing(false);
      await loadReviews();
    } catch (err: any) {
      toast.error(err?.message || 'Error al guardar la valoración');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    setDeletingId(reviewId);
    try {
      await deleteReview(reviewId);
      toast.success('Valoración eliminada');
      setEditing(false);
      await loadReviews();
    } catch (err) {
      toast.error('Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  const handleReply = async (reviewId: string) => {
    setReplyingId(reviewId);
    try {
      await replyToReview(reviewId, replyText.trim());
      toast.success('Respuesta enviada');
      setReplyOpen(null);
      setReplyText('');
      await loadReviews();
    } catch (err: any) {
      toast.error(err?.message || 'Error al responder');
    } finally {
      setReplyingId(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <MessageSquare size={20} className="text-primary" />
          Comentarios y valoraciones
        </h2>

        {/* Resumen */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-muted mb-6">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
              {reviews.length ? avg.toFixed(1).replace('.', ',') : '—'}
            </span>
            <span className="text-xs text-muted-foreground">/ 10</span>
          </div>
          <div className="flex-1">
            <StarRatingDisplay value={avg} size={20} />
            <p className="text-sm text-muted-foreground mt-1">
              {reviews.length} {reviews.length === 1 ? 'valoración' : 'valoraciones'}
            </p>
          </div>
        </div>

        {/* Formulario */}
        {user ? (
          <div className="mb-6 p-4 rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-3">
              <Star size={16} className="text-primary" />
              <h3 className="font-semibold text-card-foreground">
                {myReview ? 'Tu valoración' : 'Puntúa este evento'}
              </h3>
              {myReview && !editing && (
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => {
                    setEditing(true);
                    setRating(myReview.rating);
                    setComment(myReview.comment || '');
                  }}>
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 border-red-200" disabled={deletingId === myReview.id} onClick={() => handleDelete(myReview.id)}>
                    {deletingId === myReview.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </Button>
                </div>
              )}
            </div>

            {!myReview || editing ? (
              <div className="space-y-3">
                <StarRatingInput value={rating} onChange={setRating} />
                <Textarea
                  rows={3}
                  placeholder="Contanos cómo estuvo la experiencia (opcional)"
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                />
                <div className="flex gap-2 justify-end">
                  {editing && (
                    <Button variant="outline" onClick={() => { setEditing(false); setRating(myReview?.rating || 5); setComment(myReview?.comment || ''); }}>
                      Cancelar
                    </Button>
                  )}
                  <Button className="bg-primary text-primary-foreground" onClick={handleSubmit} disabled={submitting}>
                    {submitting && <Loader2 size={16} className="mr-1 animate-spin" />}
                    {editing ? 'Guardar cambios' : 'Enviar valoración'}
                  </Button>
                </div>
              </div>
            ) : myReview ? (
              <div>
                <StarRatingDisplay value={myReview.rating} size={16} />
                <span className="ml-2 text-sm font-semibold text-muted-foreground">{myReview.rating}/10</span>
                {myReview.comment && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-line">{myReview.comment}</p>
                )}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="mb-6 p-4 rounded-xl border border-dashed border-border text-center">
            <p className="text-sm text-muted-foreground mb-2">
              <LogIn size={14} className="inline mr-1" />
              Iniciá sesión para puntuar y comentar este evento
            </p>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Todavía no hay valoraciones. ¡Sé el primero!</p>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => {
              const date = parseDate(r.created_at);
              return (
                <div key={r.id} className="p-4 rounded-xl border border-border">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={r.author_photo || ''} />
                      <AvatarFallback className="bg-primary/15 text-primary">
                        {r.author_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-card-foreground">{r.author_name || 'Usuario'}</span>
                        <StarRatingDisplay value={r.rating} size={14} />
                        <span className="text-xs text-muted-foreground">{r.rating}/10</span>
                        {date && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {format(date, "d 'de' MMM, yyyy", { locale: es })}
                          </span>
                        )}
                      </div>
                      {r.comment && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-line">{r.comment}</p>
                      )}

                      {/* Respuesta del organizador */}
                      {r.reply && (
                        <div className="mt-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                          <p className="text-xs font-semibold text-primary mb-1">
                            <Reply size={12} className="inline mr-1" />
                            Respuesta {r.replied_by_name ? `de ${r.replied_by_name}` : 'del organizador'}
                          </p>
                          <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{r.reply}</p>
                        </div>
                      )}

                      {/* Responder (organizador/admin) */}
                      {canReply && (
                        <div className="mt-3">
                          {replyOpen === r.id ? (
                            <div className="space-y-2">
                              <Textarea
                                rows={2}
                                placeholder="Respondé esta valoración..."
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                              />
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" size="sm" onClick={() => { setReplyOpen(null); setReplyText(''); }}>
                                  Cancelar
                                </Button>
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
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
