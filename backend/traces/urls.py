from django.urls import path
from .views import ChatAndCreateTraceView, TraceListView, AnalyticsView

urlpatterns = [
    path("chat/", ChatAndCreateTraceView.as_view()),
    path("traces/", TraceListView.as_view()),
    path("analytics/", AnalyticsView.as_view()),
]