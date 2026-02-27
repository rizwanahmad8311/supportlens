from django.db.models import Avg
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Trace
from .serializers import CreateTraceSerializer, TraceSerializer
from .services import generate_chat_response, classify_trace
from .utils import Category


class ChatAndCreateTraceView(APIView):
    def post(self, request):
        serializer = CreateTraceSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user_message = serializer.validated_data["user_message"]

        bot_response, response_time_ms = generate_chat_response(user_message)

        category = classify_trace(user_message, bot_response)

        trace = Trace.objects.create(
            user_message=user_message,
            bot_response=bot_response,
            category=category,
            response_time_ms=response_time_ms,
        )

        return Response(
            TraceSerializer(trace).data,
            status=status.HTTP_201_CREATED,
        )


class TraceListView(APIView):

    def get(self, request):
        category = request.query_params.get("category")

        traces = Trace.objects.all().order_by("-timestamp")

        if category:
            traces = traces.filter(category=category)

        serializer = TraceSerializer(traces, many=True)
        return Response(serializer.data)


class AnalyticsView(APIView):

    def get(self, request):
        total = Trace.objects.count()

        breakdown = {}

        for category, _ in Category.choices:
            count = Trace.objects.filter(category=category).count()
            percentage = (count / total * 100) if total > 0 else 0

            breakdown[category] = {
                "count": count,
                "percentage": round(percentage, 2),
            }

        avg_response_time = (
                Trace.objects.aggregate(avg=Avg("response_time_ms"))["avg"] or 0
        )

        return Response({
            "total_traces": total,
            "category_breakdown": breakdown,
            "average_response_time_ms": round(avg_response_time, 2),
        })
