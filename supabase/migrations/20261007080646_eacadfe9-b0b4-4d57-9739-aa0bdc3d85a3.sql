revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.notify_events() from public, anon, authenticated;
revoke execute on function public.has_role(uuid, app_role) from public, anon;
revoke execute on function public.is_match_member(uuid) from public, anon;
grant execute on function public.has_role(uuid, app_role) to authenticated;
grant execute on function public.is_match_member(uuid) to authenticated;