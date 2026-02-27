from rest_framework import serializers

from .models import Trace


class TraceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Trace
        fields = "__all__"


class CreateTraceSerializer(serializers.Serializer):
    user_message = serializers.CharField()
