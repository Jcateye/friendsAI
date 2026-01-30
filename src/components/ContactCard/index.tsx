import { View, Text } from '@tarojs/components'
import type { Contact } from '@/types'
import { formatDate } from '@/utils'
import './index.scss'

interface ContactCardProps {
  contact: Contact
  onClick?: () => void
}

const ContactCard: React.FC<ContactCardProps> = ({ contact, onClick }) => {
  return (
    <View className="contact-card" onClick={onClick}>
      <View
        className="contact-avatar"
        style={{ backgroundColor: contact.avatarColor }}
      >
        <Text className="avatar-initial">{contact.initial}</Text>
      </View>

      <View className="contact-info">
        <View className="contact-row">
          <Text className="contact-name">{contact.name}</Text>
          {contact.lastContactTime && (
            <Text className="contact-time">{formatDate(contact.lastContactTime)}</Text>
          )}
        </View>
        {contact.lastContactSummary && (
          <Text className="contact-summary">{contact.lastContactSummary}</Text>
        )}
      </View>
    </View>
  )
}

export default ContactCard
