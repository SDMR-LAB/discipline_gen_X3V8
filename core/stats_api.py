from flask import Blueprint, jsonify, request
from datetime import datetime, timedelta, date
import random

def register_stats_api(app, db):
    bp = Blueprint('stats', __name__, url_prefix='/api/stats')

    @bp.route('/random_thought', methods=['GET'])
    def random_thought():
        try:
            from pages.completions.model import Completion
            all_completions = db.list(Completion)
            thoughts = []
            for c in all_completions:
                # Convert to dict if needed
                if hasattr(c, 'to_dict'):
                    c_dict = c.to_dict()
                else:
                    c_dict = c
                thought = c_dict.get('thoughts')
                if thought and isinstance(thought, str) and thought.strip():
                    thoughts.append(thought.strip())
            if not thoughts:
                return jsonify({'status': 'success', 'thought': None, 'message': 'Пока нет записанных мыслей. Добавьте комментарий в отчёте!'})
            thought = random.choice(thoughts)
            return jsonify({'status': 'success', 'thought': thought})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'status': 'error', 'message': str(e)}), 500

    @bp.route('/period', methods=['GET'])
    def get_period_stats():
        try:
            period = request.args.get('period', 'week')
            target_date_str = request.args.get('date', date.today().isoformat())
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()

            # Determine start date
            if period == 'week':
                start_date = target_date - timedelta(days=7)
            elif period == 'month':
                start_date = target_date - timedelta(days=30)
            else:  # all
                start_date = date(2000, 1, 1)  # far past

            from pages.completions.model import Completion
            from pages.completions.completion_habits import CompletionHabits

            # Get all completions and convert to dicts for easier handling
            all_completions = [c.to_dict() for c in db.list(Completion)]
            completions = []
            for c in all_completions:
                c_date_str = c.get('date')
                if c_date_str:
                    c_date = datetime.strptime(c_date_str, '%Y-%m-%d').date()
                    if start_date <= c_date <= target_date:
                        completions.append(c)

            # Get all completion_habits
            all_habits = [h.to_dict() for h in db.list(CompletionHabits)]

            # Initialize stats
            stats = {
                'days_count': len(completions),
                'sum_i': 0.0, 'sum_s': 0.0, 'sum_w': 0.0, 'sum_e': 0.0,
                'sum_c': 0.0, 'sum_h': 0.0, 'sum_st': 0.0, 'sum_money': 0.0,
                'avg_i': 0.0, 'avg_s': 0.0, 'avg_w': 0.0, 'avg_e': 0.0,
                'avg_c': 0.0, 'avg_h': 0.0, 'avg_st': 0.0, 'avg_money': 0.0,
            }

            if stats['days_count'] > 0:
                for completion in completions:
                    comp_id = completion.get('id')
                    comp_habits = [h for h in all_habits if h.get('completion_id') == comp_id]
                    for habit in comp_habits:
                        if habit.get('success'):
                            stats['sum_i'] += float(habit.get('i', 0))
                            stats['sum_s'] += float(habit.get('s', 0))
                            stats['sum_w'] += float(habit.get('w', 0))
                            stats['sum_e'] += float(habit.get('e', 0))
                            stats['sum_c'] += float(habit.get('c', 0))
                            stats['sum_h'] += float(habit.get('hh', 0))
                            stats['sum_st'] += float(habit.get('st', 0))
                            stats['sum_money'] += float(habit.get('money', 0))

                # Compute averages
                stats['avg_i'] = stats['sum_i'] / stats['days_count']
                stats['avg_s'] = stats['sum_s'] / stats['days_count']
                stats['avg_w'] = stats['sum_w'] / stats['days_count']
                stats['avg_e'] = stats['sum_e'] / stats['days_count']
                stats['avg_c'] = stats['sum_c'] / stats['days_count']
                stats['avg_h'] = stats['sum_h'] / stats['days_count']
                stats['avg_st'] = stats['sum_st'] / stats['days_count']
                stats['avg_money'] = stats['sum_money'] / stats['days_count']

            # Build daily data
            days_data = []
            for completion in completions:
                comp_id = completion.get('id')
                comp_habits = [h for h in all_habits if h.get('completion_id') == comp_id]
                day_date = completion.get('date')
                day_totals = {
                    'date': day_date,
                    'I': 0.0, 'S': 0.0, 'W': 0.0, 'E': 0.0,
                    'C': 0.0, 'H': 0.0, 'ST': 0.0, '$': 0.0
                }
                for habit in comp_habits:
                    if habit.get('success'):
                        day_totals['I'] += float(habit.get('i', 0))
                        day_totals['S'] += float(habit.get('s', 0))
                        day_totals['W'] += float(habit.get('w', 0))
                        day_totals['E'] += float(habit.get('e', 0))
                        day_totals['C'] += float(habit.get('c', 0))
                        day_totals['H'] += float(habit.get('hh', 0))
                        day_totals['ST'] += float(habit.get('st', 0))
                        day_totals['$'] += float(habit.get('money', 0))
                days_data.append(day_totals)

            return jsonify({
                'status': 'success',
                'period': period,
                'start_date': start_date.isoformat(),
                'end_date': target_date.isoformat(),
                'stats': stats,
                'days_data': days_data,
                'comparison': {}
            })
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'status': 'error', 'message': str(e)}), 500

    @bp.route('/streaks', methods=['GET'])
    def get_streaks():
        try:
            from pages.habits.model import Habit
            from pages.completions.completion_habits import CompletionHabits

            habits = [h.to_dict() for h in db.list(Habit)]
            # Order by id DESC to get most recent first (assuming streaks are computed from latest)
            all_completion_habits = [h.to_dict() for h in db.list(CompletionHabits, order_by='id DESC')]

            streaks = {}
            for habit in habits:
                habit_id = habit.get('id')
                # Filter entries for this habit and sort by id descending (already done by order_by)
                habit_entries = [h for h in all_completion_habits if h.get('habit_id') == habit_id]
                streak_count = 0
                # Since we have latest first, we can count consecutive successes from the start
                for entry in habit_entries:
                    if entry.get('success'):
                        streak_count += 1
                    else:
                        break
                streaks[habit_id] = {
                    'current_streak': streak_count,
                    'max_streak': streak_count,  # simplistic; could be computed from all-time
                    'habit_name': habit.get('name'),
                    'habit_category': habit.get('category') or 'Без категории'
                }
            return jsonify({'status': 'success', 'streaks': streaks})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'status': 'error', 'message': str(e)}), 500

    @bp.route('/daily_comparison', methods=['GET'])
    def get_daily_comparison():
        try:
            target_date_str = request.args.get('date', date.today().isoformat())
            target_date = datetime.strptime(target_date_str, '%Y-%m-%d').date()
            prev_date = target_date - timedelta(days=1)

            from pages.completions.model import Completion
            from pages.completions.completion_habits import CompletionHabits

            all_completions = [c.to_dict() for c in db.list(Completion)]
            all_habits = [h.to_dict() for h in db.list(CompletionHabits)]

            # Helper to get stats for a given date
            def get_stats_for_date(date_obj):
                date_str = date_obj.isoformat()
                completions = [c for c in all_completions if c.get('date') == date_str]
                stats = {'I': 0, 'S': 0, 'W': 0, 'E': 0, 'C': 0, 'H': 0, 'ST': 0, '$': 0}
                for comp in completions:
                    comp_id = comp.get('id')
                    habits = [h for h in all_habits if h.get('completion_id') == comp_id]
                    for h in habits:
                        if h.get('success'):
                            stats['I'] += float(h.get('i', 0))
                            stats['S'] += float(h.get('s', 0))
                            stats['W'] += float(h.get('w', 0))
                            stats['E'] += float(h.get('e', 0))
                            stats['C'] += float(h.get('c', 0))
                            stats['H'] += float(h.get('hh', 0))
                            stats['ST'] += float(h.get('st', 0))
                            stats['$'] += float(h.get('money', 0))
                return stats

            today_stats = get_stats_for_date(target_date)
            prev_stats = get_stats_for_date(prev_date)

            comparison = {}
            for stat in ['I', 'S', 'W', 'E', 'C', 'H', 'ST', '$']:
                if prev_stats[stat] == 0:
                    comparison[stat] = '↑' if today_stats[stat] > 0 else ('↓' if today_stats[stat] < 0 else '→')
                else:
                    change_pct = ((today_stats[stat] - prev_stats[stat]) / abs(prev_stats[stat])) * 100
                    comparison[stat] = '↑' if change_pct > 5 else ('↓' if change_pct < -5 else '→')
            return jsonify({'status': 'success', 'comparison': comparison})
        except Exception as e:
            import traceback
            traceback.print_exc()
            return jsonify({'status': 'error', 'message': str(e)}), 500

    app.register_blueprint(bp)